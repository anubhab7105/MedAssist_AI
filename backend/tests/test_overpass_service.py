"""Overpass service tests: query construction, sanitization, parsing, merging."""

import pytest

from app.models.schemas import PlaceType
from app.services.overpass_service import (
    _build_query,
    _ci_regex,
    _classify,
    _parse_results,
    find_nearby_places,
)


def test_query_builds_clauses_for_type():
    query = _build_query(33.6, 73.0, 5000, PlaceType.pharmacy, None)
    assert 'node["amenity"="pharmacy"](around:5000,33.6,73.0);' in query
    assert 'way["amenity"="pharmacy"](around:5000,33.6,73.0);' in query
    assert 'relation["amenity"="pharmacy"](around:5000,33.6,73.0);' in query
    assert '["healthcare"' not in query  # pharmacy has no healthcare tag

def test_query_all_types_includes_every_known_tag():
    query = _build_query(33.6, 73.0, 5000, None, None)
    for tag in ("amenity=doctors", "healthcare=doctor", "amenity=hospital",
                "healthcare=hospital", "amenity=clinic", "healthcare=clinic",
                "amenity=pharmacy"):
        key, _, value = tag.partition("=")
        assert f'["{key}"="{value}"]' in query


@pytest.mark.parametrize(
    "term",
    ["", "   ", "a" * 101, "Dr's <script>", 'foo"bar', "x/y\\z", "city; DROP TABLE"],
)
def test_sanitize_search_rejects_unsafe_terms(term):
    from app.services.overpass_service import sanitize_search
    with pytest.raises(ValueError):
        sanitize_search(term)


@pytest.mark.parametrize("term", ["dentist", "Dr Khan", "heart clinic, karachi", "A&E"])
def test_sanitize_search_allows_safe_terms(term):
    from app.services.overpass_service import sanitize_search
    assert sanitize_search(term) == term


def test_search_query_contains_escaped_name_regex():
    query = _build_query(33.6, 73.0, 5000, None, "Dentist")
    assert '[dD][eE][nN][tT][iI][sS][tT]' in query
    assert '"name"~"' in query


def test_ci_regex_emulates_case_insensitivity():
    assert _ci_regex("Dentist") == "[dD][eE][nN][tT][iI][sS][tT]"
    assert _ci_regex("a-b") == r"[aA]\-[bB]"


def test_classify_strips_stray_whitespace_in_osm_tags():
    assert _classify({"amenity": " doctors"}) == PlaceType.doctor
    assert _classify({"healthcare": " hospital "}) == PlaceType.hospital
    assert _classify({"amenity": "pharmacy"}) == PlaceType.pharmacy
    assert _classify({"amenity": "cafe"}) is None
    assert _classify({}) is None


def test_parse_results_builds_nearby_places():
    data = {
        "elements": [
            {
                "type": "node",
                "id": 123,
                "lat": 33.7,
                "lon": 73.0,
                "tags": {"name": "Blue Area Pharmacy", "amenity": "pharmacy", "phone": "+92 123"},
            }
        ]
    }
    places = _parse_results(data, 33.6, 73.0)
    assert len(places) == 1
    place = places[0]
    assert place.name == "Blue Area Pharmacy"
    assert place.type == PlaceType.pharmacy
    assert place.phone == "+92 123"
    assert place.distance_km > 0


def test_parse_results_skips_unclassified_and_unnamed():
    data = {"elements": [
        {"type": "node", "id": 1, "lat": 0, "lon": 0, "tags": {"name": "Cafe", "amenity": "cafe"}},
        {"type": "node", "id": 2, "lat": 0, "lon": 0, "tags": {"amenity": "pharmacy"}},
    ]}
    assert _parse_results(data, 0, 0) == []


def test_find_nearby_places_all_merges_and_sorts(monkeypatch):
    from app.services import overpass_service as svc

    responses = iter([
        {"elements": [{"type": "node", "id": 1, "lat": 33.7, "lon": 73.0,
                       "tags": {"name": "Pharm A", "amenity": "pharmacy"}}]},
        {"elements": [{"type": "node", "id": 2, "lat": 33.65, "lon": 73.0,
                       "tags": {"name": "Hosp B", "amenity": "hospital"}}]},
        {"elements": []},
        {"elements": []},
    ])

    async def fake_query(query):
        return next(responses)

    monkeypatch.setattr(svc, "_query_overpass", fake_query)
    import asyncio
    places = asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, None))
    assert [p.name for p in places] == ["Hosp B", "Pharm A"]  # sorted by distance


def test_find_nearby_places_all_fails_when_everything_fails(monkeypatch):
    from app.services import overpass_service as svc

    async def fake_query(query):
        raise RuntimeError("provider down")

    monkeypatch.setattr(svc, "_query_overpass", fake_query)
    import asyncio
    with pytest.raises(Exception, match="All Overpass providers failed"):
        asyncio.run(svc.find_nearby_places(33.6, 73.0, 5000, None))