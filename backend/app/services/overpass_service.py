"""
Queries OpenStreetMap's Overpass API for nearby medical points of
interest around a given lat/lng, and ranks results by distance.
"""

import math
import asyncio
import re
import logging

import httpx

from app.core.config import get_settings
from app.models.schemas import NearbyPlace, PlaceType

settings = get_settings()
logger = logging.getLogger(__name__)

_OVERPASS_URLS = [
    settings.overpass_api_url,
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
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

# Broader health-related OSM values matched during free-text search, and
# the PlaceType they should be bucketed into.
_SEARCH_VALUE_TYPES: dict[str, PlaceType] = {
    "dentist": PlaceType.doctor,
    "general_practitioner": PlaceType.doctor,
    "physiotherapist": PlaceType.doctor,
    "physiotherapy": PlaceType.doctor,
    "chiropractor": PlaceType.doctor,
    "osteopath": PlaceType.doctor,
    "psychotherapist": PlaceType.doctor,
    "optometrist": PlaceType.doctor,
    "podiatrist": PlaceType.doctor,
    "blood_bank": PlaceType.clinic,
    "health_centre": PlaceType.clinic,
    "health_center": PlaceType.clinic,
    "laboratory": PlaceType.clinic,
    "rehabilitation": PlaceType.clinic,
    "community_health_worker": PlaceType.clinic,
    "nursing_home": PlaceType.clinic,
    "social_facility": PlaceType.clinic,
    "midwife": PlaceType.clinic,
    "emergency": PlaceType.hospital,
    "pharmaceutical": PlaceType.pharmacy,
}

# Keys + values a free-text search is restricted to, so a search like
# "dental care" still only returns health-related places.
_SEARCH_HEALTHCARE = (
    "doctor|hospital|clinic|pharmacy|dentist|laboratory|physiotherapist|"
    "physiotherapy|optometrist|nurse|midwife|chiropractor|osteopath|podiatrist|"
    "psychotherapist|blood_bank|rehabilitation|nursing_home|health_centre|"
    "health_center|general_practitioner|emergency|pharmaceutical|social_facility|"
    "community_health_worker"
)
_SEARCH_AMENITY = (
    "hospital|clinic|doctors|pharmacy|dentist|laboratory|veterinary|"
    "physiotherapy|blood_bank|nursing_home|social_facility|emergency|"
    "health_centre|health_center"
)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _escape_regex(term: str) -> str:
    return term.replace("\\", "\\\\").replace('"', '\\"').replace("/", "\\/")


def _ci_regex(term: str) -> str:
    """Build a case-insensitive regex without the `,i` flag.

    The main Overpass instance silently returns zero matches for
    `~"term",i`, so we emulate case-insensitivity with per-character
    classes: "Dentist" -> "[Dd][Ee][Nn][Tt][Ii][Ss][Tt]".
    """
    return "".join(
        f"[{ch.lower()}{ch.upper()}]" if ch.isascii() and ch.isalpha() else re.escape(ch)
        for ch in term
    )


def _build_query(lat: float, lng: float, radius_m: int, place_type: PlaceType | None, search: str | None) -> str:
    if search:
        name_re = _ci_regex(search)
        return f"""
[out:json][timeout:20];
(
  node["name"~"{name_re}"]["healthcare"~"{_SEARCH_HEALTHCARE}"](around:{radius_m},{lat},{lng});
  node["name"~"{name_re}"]["amenity"~"{_SEARCH_AMENITY}"](around:{radius_m},{lat},{lng});
);
out center tags;
"""

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
    amenity = (tags.get("amenity") or "").strip()
    healthcare = (tags.get("healthcare") or "").strip()
    if amenity == "pharmacy" or healthcare == "pharmacy":
        return PlaceType.pharmacy
    if amenity == "hospital" or healthcare == "hospital":
        return PlaceType.hospital
    if amenity == "clinic" or healthcare == "clinic":
        return PlaceType.clinic
    if amenity == "doctors" or healthcare == "doctor":
        return PlaceType.doctor
    for value in (healthcare, amenity):
        if value and value in _SEARCH_VALUE_TYPES:
            return _SEARCH_VALUE_TYPES[value]
    return None


async def _query_overpass(query: str) -> dict:
    """POST a query to the first Overpass provider that answers it."""
    errors: list[str] = []
    timeout = httpx.Timeout(35.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for url in dict.fromkeys(_OVERPASS_URLS):
            for attempt in range(2):
                try:
                    response = await client.post(url, data={"data": query})
                    response.raise_for_status()
                    return response.json()
                except httpx.HTTPError as exc:
                    errors.append(f"{url} (attempt {attempt + 1}): {exc}")
                    await asyncio.sleep(1.5)
    raise httpx.HTTPError(f"All Overpass providers failed: {' | '.join(errors)}")


def _parse_results(data: dict, lat: float, lng: float) -> list[NearbyPlace]:
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
        address = ", ".join(p.strip() for p in address_parts if p and p.strip()) or None

        results.append(
            NearbyPlace(
                id=f"{element['type']}/{element['id']}",
                name=name.strip(),
                type=classified,
                latitude=elat,
                longitude=elng,
                distance_km=round(_haversine_km(lat, lng, elat, elng), 2),
                address=address,
                phone=(tags.get("phone") or tags.get("contact:phone") or "").strip() or None,
            )
        )
    return results


async def find_nearby_places(
    lat: float, lng: float, radius_m: int, place_type: PlaceType | None, search: str | None = None
) -> list[NearbyPlace]:
    if place_type is not None or search:
        query = _build_query(lat, lng, radius_m, place_type, search)
        results = _parse_results(await _query_overpass(query), lat, lng)
    else:
        # "All" filter: the combined query times out on the public Overpass
        # instances, so query each place type separately and merge the results.
        data_list = await asyncio.gather(
            *(_query_overpass(_build_query(lat, lng, radius_m, pt, None)) for pt in PlaceType),
            return_exceptions=True,
        )
        if all(isinstance(d, Exception) for d in data_list):
            raise httpx.HTTPError("All Overpass providers failed")
        results = [
            place
            for data in data_list
            if not isinstance(data, Exception)
            for place in _parse_results(data, lat, lng)
        ]

    results.sort(key=lambda p: p.distance_km)
    return results
