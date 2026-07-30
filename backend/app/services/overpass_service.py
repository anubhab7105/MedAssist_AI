"""
Queries OpenStreetMap's Overpass API for nearby medical points of
interest around a given lat/lng, and ranks results by distance.
"""

import math
import logging

import httpx

from app.core.config import get_settings
from app.models.schemas import NearbyPlace, PlaceType

settings = get_settings()
logger = logging.getLogger(__name__)

_OVERPASS_URLS = [
    settings.overpass_api_url,
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]

# Maps our PlaceType enum to the OSM tags that identify it.
_OSM_TAGS: dict[PlaceType, list[str]] = {
    PlaceType.doctor: ['amenity=doctors', 'healthcare=doctor'],
    PlaceType.hospital: ['amenity=hospital', 'healthcare=hospital'],
    PlaceType.clinic: ['amenity=clinic', 'healthcare=clinic'],
    PlaceType.pharmacy: ['amenity=pharmacy'],
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _build_query(lat: float, lng: float, radius_m: int, place_type: PlaceType | None) -> str:
    if place_type:
        tag_filters = _OSM_TAGS[place_type]
    else:
        tag_filters = [tag for tags in _OSM_TAGS.values() for tag in tags]

    clauses = []
    for tag in tag_filters:
        key, _, value = tag.partition("=")
        clauses.append(f'node["{key}"="{value}"](around:{radius_m},{lat},{lng});')
        clauses.append(f'way["{key}"="{value}"](around:{radius_m},{lat},{lng});')
        clauses.append(f'relation["{key}"="{value}"](around:{radius_m},{lat},{lng});')

    body = "\n  ".join(clauses)
    return f"""
[out:json][timeout:25];
(
  {body}
);
out center tags;
"""


def _classify(tags: dict) -> PlaceType | None:
    amenity = tags.get("amenity")
    healthcare = tags.get("healthcare")
    if amenity == "pharmacy":
        return PlaceType.pharmacy
    if amenity == "hospital" or healthcare == "hospital":
        return PlaceType.hospital
    if amenity == "clinic" or healthcare == "clinic":
        return PlaceType.clinic
    if amenity == "doctors" or healthcare == "doctor":
        return PlaceType.doctor
    return None


async def find_nearby_places(
    lat: float, lng: float, radius_m: int, place_type: PlaceType | None
) -> list[NearbyPlace]:
    query = _build_query(lat, lng, radius_m, place_type)

    data = None
    errors: list[str] = []
    timeout = httpx.Timeout(12.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for url in dict.fromkeys(_OVERPASS_URLS):
            try:
                response = await client.post(url, data={"data": query})
                response.raise_for_status()
                data = response.json()
                break
            except httpx.HTTPError as exc:
                errors.append(f"{url}: {exc}")

    if data is None:
        logger.warning("All Overpass providers failed: %s", " | ".join(errors))
        raise httpx.HTTPError("All Overpass providers failed")

    results: list[NearbyPlace] = []
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name")
        if not name:
            continue

        classified = _classify(tags)
        if not classified:
            continue

        if element["type"] == "node":
            elat, elng = element["lat"], element["lon"]
        else:
            center = element.get("center")
            if not center:
                continue
            elat, elng = center["lat"], center["lon"]

        address_parts = [
            tags.get("addr:housenumber"),
            tags.get("addr:street"),
            tags.get("addr:city"),
        ]
        address = ", ".join(p for p in address_parts if p) or None

        results.append(
            NearbyPlace(
                id=f"{element['type']}/{element['id']}",
                name=name,
                type=classified,
                latitude=elat,
                longitude=elng,
                distance_km=round(_haversine_km(lat, lng, elat, elng), 2),
                address=address,
                phone=tags.get("phone") or tags.get("contact:phone"),
            )
        )

    results.sort(key=lambda p: p.distance_km)
    return results
