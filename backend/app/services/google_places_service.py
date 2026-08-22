"""
Queries Google Places API (New) for nearby medical points of interest
around a given lat/lng, and ranks results by distance.

Drop-in replacement for overpass_service.py — exposes the same
``find_nearby_places()`` signature and returns the same ``NearbyPlace``
schema so the route handler needs only an import swap.

All external calls go through app.core.http_client (circuit breaker +
retry).  Results are cached in-memory with a 30-minute TTL.
"""

import asyncio
import math
import time
import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.http_client import request_with_retry
from app.models.schemas import NearbyPlace, PlaceType

settings = get_settings()
logger = logging.getLogger(__name__)

_BASE_URL = "https://places.googleapis.com/v1"

# ── Type mappings ─────────────────────────────────────────────────────

# Our PlaceType → Google Places "includedTypes" for Nearby Search
_PLACE_TYPE_TO_GOOGLE: dict[PlaceType, list[str]] = {
    PlaceType.doctor: ["doctor", "dentist", "physiotherapist"],
    PlaceType.hospital: ["hospital"],
    PlaceType.clinic: ["medical_lab", "health"],
    PlaceType.pharmacy: ["pharmacy"],
}

# Reverse mapping: Google type string → our PlaceType (first match wins)
_GOOGLE_TYPE_TO_PLACE: dict[str, PlaceType] = {
    "hospital": PlaceType.hospital,
    "medical_lab": PlaceType.clinic,
    "health": PlaceType.clinic,
    "doctor": PlaceType.doctor,
    "dentist": PlaceType.doctor,
    "physiotherapist": PlaceType.doctor,
    "pharmacy": PlaceType.pharmacy,
}

# Priority for resolving conflicts when a place has multiple matching types
_TYPE_PRIORITY: dict[PlaceType, int] = {
    PlaceType.hospital: 0,
    PlaceType.clinic: 1,
    PlaceType.doctor: 2,
    PlaceType.pharmacy: 3,
}

# ── Cache ─────────────────────────────────────────────────────────────

_CACHE_TTL_SECONDS = 30 * 60
_MAX_CACHE_ENTRIES = 200

_cache: dict[tuple, tuple[float, list[NearbyPlace]]] = {}
_key_locks: dict[tuple, asyncio.Lock] = {}


def _lock_for(key: tuple) -> asyncio.Lock:
    lock = _key_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _key_locks[key] = lock
    return lock


def _cache_key(
    lat: float, lng: float, radius_m: int,
    place_type: PlaceType | None, search: str | None,
) -> tuple:
    return (
        round(lat, 2),
        round(lng, 2),
        radius_m // 1000,
        place_type.value if place_type else None,
        search,
    )


def clear_cache() -> None:
    """Drop all cached results (used by tests)."""
    _cache.clear()
    _key_locks.clear()


# ── Helpers ───────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _classify(types: list[str]) -> PlaceType | None:
    """Map a Google Place's ``types`` list to our PlaceType enum.

    When multiple types match, the one with the highest priority
    (hospital > clinic > doctor > pharmacy) wins.
    """
    best: PlaceType | None = None
    best_priority = len(_TYPE_PRIORITY)

    for t in types:
        pt = _GOOGLE_TYPE_TO_PLACE.get(t)
        if pt is not None:
            p = _TYPE_PRIORITY[pt]
            if p < best_priority:
                best = pt
                best_priority = p
    return best


def _field_mask() -> str:
    """Return the FieldMask header value to request only the fields we need."""
    return ",".join([
        "places.id",
        "places.displayName",
        "places.types",
        "places.location",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
    ])


def _headers() -> dict[str, str]:
    return {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": _field_mask(),
        "Content-Type": "application/json",
    }


# ── API calls ─────────────────────────────────────────────────────────

async def _search_nearby(
    lat: float, lng: float, radius_m: int, included_types: list[str],
) -> dict:
    """POST places:searchNearby — type-based radius search."""
    url = f"{_BASE_URL}/places:searchNearby"
    body: dict[str, Any] = {
        "includedTypes": included_types,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(min(radius_m, 50000)),  # Google max is 50km
            }
        },
        "maxResultCount": 20,
    }
    timeout = httpx.Timeout(settings.google_places_timeout_seconds, connect=5.0)
    response = await request_with_retry(
        "POST", url, timeout=timeout, retries=2,
        headers=_headers(), json=body,
    )
    response.raise_for_status()
    return response.json()


async def _search_text(
    lat: float, lng: float, radius_m: int, query: str,
) -> dict:
    """POST places:searchText — free-text search with location bias."""
    url = f"{_BASE_URL}/places:searchText"
    body: dict[str, Any] = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(min(radius_m, 50000)),
            }
        },
        "maxResultCount": 20,
    }
    timeout = httpx.Timeout(settings.google_places_timeout_seconds, connect=5.0)
    response = await request_with_retry(
        "POST", url, timeout=timeout, retries=2,
        headers=_headers(), json=body,
    )
    response.raise_for_status()
    return response.json()


# ── Parsing ───────────────────────────────────────────────────────────

def _parse_results(data: dict, lat: float, lng: float) -> list[NearbyPlace]:
    """Convert a Google Places API response to a list of NearbyPlace."""
    results: list[NearbyPlace] = []

    for place in data.get("places", []):
        # Display name
        display_name = place.get("displayName", {})
        name = display_name.get("text", "").strip()
        if not name:
            continue

        # Classify by types
        types = place.get("types", [])
        classified = _classify(types)
        if not classified:
            continue

        # Location
        location = place.get("location", {})
        p_lat = location.get("latitude")
        p_lng = location.get("longitude")
        if p_lat is None or p_lng is None:
            continue

        results.append(
            NearbyPlace(
                id=place.get("id", ""),
                name=name,
                type=classified,
                latitude=p_lat,
                longitude=p_lng,
                distance_km=round(_haversine_km(lat, lng, p_lat, p_lng), 2),
                address=place.get("formattedAddress"),
                phone=place.get("nationalPhoneNumber"),
            )
        )

    return results


# ── Cached query ──────────────────────────────────────────────────────

async def _query_with_cache(
    lat: float, lng: float, radius_m: int,
    place_type: PlaceType | None, search: str | None,
) -> list[NearbyPlace]:
    """Query Google Places for one (type, search) combo, with a TTL cache
    and per-key lock to prevent stampedes."""
    key = _cache_key(lat, lng, radius_m, place_type, search)
    now = time.monotonic()

    entry = _cache.get(key)
    if entry and now - entry[0] < _CACHE_TTL_SECONDS:
        return entry[1]

    async with _lock_for(key):
        # Double-check after acquiring the lock
        entry = _cache.get(key)
        if entry and now - entry[0] < _CACHE_TTL_SECONDS:
            return entry[1]

        if not settings.google_places_api_key:
            raise httpx.HTTPError(
                "GOOGLE_PLACES_API_KEY is not configured. "
                "Set it in backend/.env or disable USE_GOOGLE_PLACES."
            )

        if search:
            data = await _search_text(lat, lng, radius_m, search)
        elif place_type:
            included = _PLACE_TYPE_TO_GOOGLE[place_type]
            data = await _search_nearby(lat, lng, radius_m, included)
        else:
            # All types — single query with all included types merged
            all_types = [t for types in _PLACE_TYPE_TO_GOOGLE.values() for t in types]
            data = await _search_nearby(lat, lng, radius_m, all_types)

        result = _parse_results(data, lat, lng)
        _cache[key] = (time.monotonic(), result)

        if len(_cache) > _MAX_CACHE_ENTRIES:
            oldest = min(_cache, key=lambda k: _cache[k][0])
            del _cache[oldest]

        return result


# ── Public API ────────────────────────────────────────────────────────

async def find_nearby_places(
    lat: float, lng: float, radius_m: int,
    place_type: PlaceType | None, search: str | None = None,
) -> list[NearbyPlace]:
    """Find nearby medical places using Google Places API (New).

    Drop-in replacement for overpass_service.find_nearby_places —
    same signature, same return type, same error semantics.
    """
    results = await _query_with_cache(lat, lng, radius_m, place_type, search)
    results.sort(key=lambda p: p.distance_km)
    return results
