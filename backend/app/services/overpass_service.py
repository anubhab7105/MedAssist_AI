"""
Queries OpenStreetMap's Overpass API for nearby medical points of
interest around a given lat/lng, and ranks results by distance.

All external calls go through app.core.http_client (circuit breaker +
retry), and every dynamic value that ends up inside an Overpass query
string is strictly sanitized before interpolation.
"""

import math
import asyncio
import itertools
import re
import time
import logging

import httpx

from app.core.config import get_settings
from app.core.http_client import request_with_retry
from app.models.schemas import NearbyPlace, PlaceType

settings = get_settings()
logger = logging.getLogger(__name__)

_OVERPASS_URLS = [
    settings.overpass_api_url,
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]

# Race a subset of mirrors per query: racing all of them multiplies load
# on the public instances (they rate-limit by IP). Round-robining which
# subset we hit spreads the queries across the pool.
_MAX_RACE_PROVIDERS = 3
_race_rotator = itertools.cycle(range(len(_OVERPASS_URLS)))


def _race_urls() -> list[str]:
    pool = list(dict.fromkeys(_OVERPASS_URLS))
    start = next(_race_rotator)
    return [pool[(start + i) % len(pool)] for i in range(min(_MAX_RACE_PROVIDERS, len(pool)))]

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

# Free-text search input is allow-listed to letters, digits, spaces and a
# few separators. Anything else is rejected rather than escaped, so the
# query string can never be corrupted by unusual characters.
_SEARCH_ALLOWLIST = re.compile(r"^[A-Za-z0-9 .,'\-&+]+$")

# In-memory TTL cache for parsed Overpass results. OSM data changes
# rarely, so repeated searches (same area/tab switching) are served from
# cache instead of hitting the slow public Overpass instances again.
_CACHE_TTL_SECONDS = 30 * 60
_MAX_CACHE_ENTRIES = 200

_cache: dict[tuple, tuple[float, list[NearbyPlace]]] = {}
# Per-key locks: only duplicate in-flight queries for the SAME (area, type,
# search) stampede-protect each other; different types still run in parallel.
_key_locks: dict[tuple, asyncio.Lock] = {}


def _lock_for(key: tuple) -> asyncio.Lock:
    lock = _key_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _key_locks[key] = lock
    return lock


def _cache_key(lat: float, lng: float, radius_m: int, place_type: PlaceType | None, search: str | None) -> tuple:
    return (
        round(lat, 2),
        round(lng, 2),
        radius_m // 1000,
        place_type.value if place_type else None,
        search,
    )


def clear_cache() -> None:
    """Drop all cached Overpass results (used by tests)."""
    _cache.clear()
    _key_locks.clear()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


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


def sanitize_search(term: str) -> str:
    """Validate a free-text search term for safe use inside an Overpass
    query. Raises ValueError for empty or disallowed input; everything
    the allowlist keeps is already safe to interpolate (letters, digits,
    spaces, '.', '-', ',' and apostrophes — all regex-escaped below)."""
    term = term.strip()
    if not term:
        raise ValueError("Search term must not be empty")
    if len(term) > 100:
        raise ValueError("Search term must be 100 characters or fewer")
    if not _SEARCH_ALLOWLIST.match(term):
        raise ValueError("Search term contains unsupported characters")
    return re.sub(r"\s+", " ", term)


def _build_query(lat: float, lng: float, radius_m: int, place_type: PlaceType | None, search: str | None) -> str:
    if search:
        name_re = _ci_regex(sanitize_search(search))
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
    """POST a query to every Overpass provider concurrently and return the
    first successful response.

    Racing the mirrors instead of trying them one-by-one means a slow or
    hung primary instance no longer blocks the whole search for up to
    5 x timeout. Each host still goes through the shared circuit breaker,
    so a down provider fails fast without being hammered.
    """
    timeout = httpx.Timeout(min(settings.overpass_timeout_seconds, 25), connect=5.0)
    errors: list[str] = []

    async def attempt(url: str) -> dict:
        try:
            response = await request_with_retry(
                "POST",
                url,
                timeout=timeout,
                retries=0,  # the concurrent race handles failover, no internal retries
                data={"data": query},
            )
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            errors.append(f"{url}: {exc}")
            raise

    urls = _race_urls()
    tasks = {asyncio.create_task(attempt(url)): url for url in urls}
    pending = set(tasks)
    empty_results: list[dict] = []
    try:
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                if task.cancelled():
                    continue
                if task.exception() is None:
                    data = task.result()
                    if data.get("elements"):
                        # A mirror can answer instantly with an empty result
                        # (stale DB); only a non-empty answer wins the race.
                        return data
                    empty_results.append(data)
            if empty_results and not pending:
                # Every provider answered, all genuinely empty (e.g. remote area).
                return empty_results[0]
    finally:
        for task in tasks:
            task.cancel()

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


async def _query_with_cache(
    lat: float, lng: float, radius_m: int, place_type: PlaceType | None, search: str | None
) -> list[NearbyPlace]:
    """Query Overpass for one (type, search) combo, caching parsed results
    for _CACHE_TTL_SECONDS. A lock prevents duplicate in-flight queries
    stampeding the public Overpass instances."""
    key = _cache_key(lat, lng, radius_m, place_type, search)
    now = time.monotonic()

    entry = _cache.get(key)
    if entry and now - entry[0] < _CACHE_TTL_SECONDS:
        return entry[1]

    async with _lock_for(key):
        entry = _cache.get(key)
        if entry and now - entry[0] < _CACHE_TTL_SECONDS:
            return entry[1]

        query = _build_query(lat, lng, radius_m, place_type, search)
        data = await _query_overpass(query)
        result = _parse_results(data, lat, lng)
        _cache[key] = (time.monotonic(), result)

        if len(_cache) > _MAX_CACHE_ENTRIES:
            oldest = min(_cache, key=lambda k: _cache[k][0])
            del _cache[oldest]
        return result


async def find_nearby_places(
    lat: float, lng: float, radius_m: int, place_type: PlaceType | None, search: str | None = None
) -> list[NearbyPlace]:
    if place_type is not None or search:
        results = await _query_with_cache(lat, lng, radius_m, place_type, search)
    else:
        # "All" filter: the combined query times out on the public Overpass
        # instances, so query each place type separately and merge the results.
        # Each type is cached individually, so the tab filters reuse the same data.
        data_list = await asyncio.gather(
            *(_query_with_cache(lat, lng, radius_m, pt, None) for pt in PlaceType),
            return_exceptions=True,
        )
        if all(isinstance(d, Exception) for d in data_list):
            raise httpx.HTTPError("All Overpass providers failed")
        results = [place for d in data_list if not isinstance(d, Exception) for place in d]

    results.sort(key=lambda p: p.distance_km)
    return results