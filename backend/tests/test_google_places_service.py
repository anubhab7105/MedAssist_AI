"""Google Places service tests: type mapping, parsing, caching, error handling."""

import asyncio
import time

import pytest
import httpx

from app.models.schemas import PlaceType, NearbyPlace
from app.services.google_places_service import (
    _classify,
    _haversine_km,
    _parse_results,
    _PLACE_TYPE_TO_GOOGLE,
    _TYPE_PRIORITY,
    clear_cache,
    find_nearby_places,
)


# ── Type mapping ──────────────────────────────────────────────────────

def test_type_mapping_covers_all_place_types():
    """Every PlaceType enum value must have a Google types mapping."""
    for pt in PlaceType:
        assert pt in _PLACE_TYPE_TO_GOOGLE, f"Missing Google mapping for {pt}"
        assert len(_PLACE_TYPE_TO_GOOGLE[pt]) > 0


def test_classify_single_type():
    assert _classify(["doctor"]) == PlaceType.doctor
    assert _classify(["hospital"]) == PlaceType.hospital
    assert _classify(["pharmacy"]) == PlaceType.pharmacy
    assert _classify(["medical_lab"]) == PlaceType.clinic
    assert _classify(["dentist"]) == PlaceType.doctor


def test_classify_returns_none_for_unmatched():
    assert _classify([]) is None
    assert _classify(["restaurant", "food"]) is None
    assert _classify(["point_of_interest"]) is None


def test_classify_priority_hospital_over_doctor():
    """When a place has both hospital and doctor types, hospital wins."""
    result = _classify(["doctor", "hospital", "point_of_interest"])
    assert result == PlaceType.hospital


def test_classify_priority_clinic_over_doctor():
    result = _classify(["doctor", "medical_lab"])
    assert result == PlaceType.clinic


def test_classify_priority_hospital_over_pharmacy():
    result = _classify(["pharmacy", "hospital"])
    assert result == PlaceType.hospital


def test_type_priority_ordering():
    """Verify the explicit priority order: hospital > clinic > doctor > pharmacy."""
    assert _TYPE_PRIORITY[PlaceType.hospital] < _TYPE_PRIORITY[PlaceType.clinic]
    assert _TYPE_PRIORITY[PlaceType.clinic] < _TYPE_PRIORITY[PlaceType.doctor]
    assert _TYPE_PRIORITY[PlaceType.doctor] < _TYPE_PRIORITY[PlaceType.pharmacy]


# ── Haversine ─────────────────────────────────────────────────────────

def test_haversine_same_point():
    assert _haversine_km(33.6, 73.0, 33.6, 73.0) == 0.0


def test_haversine_known_distance():
    # Delhi (28.6139, 77.2090) to Agra (27.1767, 78.0081) ≈ 178 km
    dist = _haversine_km(28.6139, 77.2090, 27.1767, 78.0081)
    assert 170 < dist < 185


# ── Parsing ───────────────────────────────────────────────────────────

def _make_google_place(
    place_id="ChIJ_test",
    name="Test Pharmacy",
    types=None,
    lat=33.7,
    lng=73.0,
    address="123 Main St",
    phone="+92 300 1234567",
):
    return {
        "id": place_id,
        "displayName": {"text": name, "languageCode": "en"},
        "types": types or ["pharmacy"],
        "location": {"latitude": lat, "longitude": lng},
        "formattedAddress": address,
        "nationalPhoneNumber": phone,
    }


def test_parse_nearby_response_builds_places():
    data = {
        "places": [
            _make_google_place(
                place_id="ChIJ_pharm1",
                name="Blue Area Pharmacy",
                types=["pharmacy", "point_of_interest", "establishment"],
                lat=33.7,
                lng=73.0,
                phone="+92 123",
            ),
        ]
    }
    places = _parse_results(data, 33.6, 73.0)
    assert len(places) == 1
    place = places[0]
    assert place.name == "Blue Area Pharmacy"
    assert place.type == PlaceType.pharmacy
    assert place.id == "ChIJ_pharm1"
    assert place.phone == "+92 123"
    assert place.distance_km > 0


def test_parse_text_search_response():
    data = {
        "places": [
            _make_google_place(
                name="City Hospital",
                types=["hospital", "point_of_interest", "establishment"],
                lat=28.62,
                lng=77.21,
                address="New Delhi, India",
            ),
            _make_google_place(
                name="Dr. Smith Clinic",
                types=["doctor", "health", "point_of_interest"],
                lat=28.63,
                lng=77.22,
            ),
        ]
    }
    places = _parse_results(data, 28.61, 77.20)
    assert len(places) == 2
    assert places[0].type == PlaceType.hospital
    # "doctor" + "health" → clinic wins over doctor (health maps to clinic)
    assert places[1].type == PlaceType.clinic


def test_parse_skips_unnamed_places():
    data = {
        "places": [
            {
                "id": "ChIJ_no_name",
                "displayName": {"text": "", "languageCode": "en"},
                "types": ["pharmacy"],
                "location": {"latitude": 33.7, "longitude": 73.0},
            },
        ]
    }
    assert _parse_results(data, 33.6, 73.0) == []


def test_parse_skips_unclassified_places():
    data = {
        "places": [
            _make_google_place(
                name="Nice Restaurant",
                types=["restaurant", "food", "point_of_interest"],
            ),
        ]
    }
    assert _parse_results(data, 33.6, 73.0) == []


def test_parse_skips_places_without_location():
    data = {
        "places": [
            {
                "id": "ChIJ_no_loc",
                "displayName": {"text": "Test Place"},
                "types": ["pharmacy"],
                # no "location" key
            },
        ]
    }
    assert _parse_results(data, 33.6, 73.0) == []


def test_parse_empty_response():
    assert _parse_results({}, 33.6, 73.0) == []
    assert _parse_results({"places": []}, 33.6, 73.0) == []


# ── find_nearby_places integration ────────────────────────────────────

def test_find_nearby_merges_and_sorts(monkeypatch):
    from app.services import google_places_service as svc

    clear_cache()

    fake_response = {
        "places": [
            _make_google_place(
                place_id="far", name="Far Pharmacy",
                types=["pharmacy"], lat=33.8, lng=73.0,
            ),
            _make_google_place(
                place_id="near", name="Near Hospital",
                types=["hospital"], lat=33.65, lng=73.0,
            ),
        ]
    }

    async def fake_search_nearby(lat, lng, radius_m, included_types):
        return fake_response

    monkeypatch.setattr(svc, "_search_nearby", fake_search_nearby)
    monkeypatch.setattr(svc.settings, "google_places_api_key", "test-key")

    places = asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, None))
    # Sorted by distance: Near Hospital (0.05°) closer than Far Pharmacy (0.2°)
    assert places[0].name == "Near Hospital"
    assert places[1].name == "Far Pharmacy"
    assert places[0].distance_km < places[1].distance_km

    clear_cache()


def test_find_nearby_with_search_uses_text_search(monkeypatch):
    from app.services import google_places_service as svc

    clear_cache()

    called_with = {}

    async def fake_search_text(lat, lng, radius_m, query):
        called_with["query"] = query
        return {
            "places": [
                _make_google_place(name="Dental Care", types=["dentist"]),
            ]
        }

    monkeypatch.setattr(svc, "_search_text", fake_search_text)
    monkeypatch.setattr(svc.settings, "google_places_api_key", "test-key")

    places = asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, None, "dentist"))
    assert called_with["query"] == "dentist"
    assert len(places) == 1
    assert places[0].type == PlaceType.doctor  # dentist → doctor

    clear_cache()


def test_missing_api_key_raises(monkeypatch):
    from app.services import google_places_service as svc

    clear_cache()
    monkeypatch.setattr(svc.settings, "google_places_api_key", "")

    with pytest.raises(httpx.HTTPError, match="GOOGLE_PLACES_API_KEY"):
        asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, PlaceType.pharmacy))

    clear_cache()


def test_cache_returns_same_result(monkeypatch):
    from app.services import google_places_service as svc

    clear_cache()

    call_count = 0

    async def fake_search_nearby(lat, lng, radius_m, included_types):
        nonlocal call_count
        call_count += 1
        return {
            "places": [
                _make_google_place(name="Cached Pharmacy", types=["pharmacy"]),
            ]
        }

    monkeypatch.setattr(svc, "_search_nearby", fake_search_nearby)
    monkeypatch.setattr(svc.settings, "google_places_api_key", "test-key")

    # First call — hits the API
    places1 = asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, PlaceType.pharmacy))
    assert call_count == 1
    assert len(places1) == 1

    # Second call — should come from cache
    places2 = asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, PlaceType.pharmacy))
    assert call_count == 1  # not incremented
    assert places1[0].name == places2[0].name

    clear_cache()
