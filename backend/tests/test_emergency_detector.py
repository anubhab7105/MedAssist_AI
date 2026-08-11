"""Two-stage emergency detection tests.

Stage 1 recall (true positives must fire) and stage 2 precision
(negated / historical / hypothetical mentions must NOT fire).
"""

import pytest

from app.services.emergency_detector import (
    EMERGENCY_MESSAGE,
    SELF_HARM_MESSAGE,
    detect_emergency,
    get_emergency_message,
)


@pytest.mark.parametrize(
    "text,category",
    [
        ("I have crushing chest pain radiating to my arm", "chest_pain"),
        ("My face is drooping and speech is slurred", "stroke"),
        ("I can't breathe properly", "breathing"),
        ("I am vomiting blood", "bleeding"),
        ("He is unresponsive after passing out", "unconsciousness"),
        ("My son had a seizure two minutes ago", "seizure"),
        ("I want to kill myself", "self_harm"),
    ],
)
def test_true_positives_trigger(text, category):
    match = detect_emergency(text)
    assert match.triggered
    assert category in match.matched_categories


@pytest.mark.parametrize(
    "text",
    [
        "I don't have chest pain at all",
        "No shortness of breath during exercise",
        "She denies any heavy bleeding",
        "What if I have chest pain? Should I be worried?",
        "Does chest pain always mean a heart attack?",
        "I had chest pain last year and it was nothing",
        "Is it normal to have tightness in your chest after running?",
    ],
)
def test_false_positives_suppressed(text):
    match = detect_emergency(text)
    assert not match.triggered


def test_suppression_is_recorded_for_negated_mentions():
    match = detect_emergency("I don't have chest pain at all")
    assert not match.triggered
    assert "chest_pain" in match.suppressed


def test_nothing_matched_is_not_recorded_as_suppressed():
    # "stroke" is not part of the recall patterns — clean non-trigger.
    match = detect_emergency("My grandfather had a stroke when he was 60")
    assert not match.triggered
    assert match.matched_categories == []


def test_mixed_message_confirms_real_emergency_only():
    # Negated chest pain, but difficulty breathing is live in the same message.
    match = detect_emergency("No chest pain, but I have trouble breathing right now")
    assert match.triggered
    assert "breathing" in match.matched_categories
    assert "chest_pain" not in match.matched_categories


def test_self_harm_never_suppressed_even_hypothetically():
    match = detect_emergency("What if I want to die?")
    assert match.triggered
    assert "self_harm" in match.matched_categories


def test_confidence_scales_with_category_count():
    single = detect_emergency("I am vomiting blood")
    multi = detect_emergency("I am vomiting blood and cannot breathe and passed out")
    assert single.confidence == pytest.approx(0.9)
    assert multi.confidence > single.confidence
    assert multi.confidence <= 1.0


def test_no_match_returns_clean_state():
    match = detect_emergency("I have a mild headache and some fatigue")
    assert not match.triggered
    assert match.matched_categories == []


def test_emergency_message_selection():
    self_harm = detect_emergency("I want to die")
    bleeding = detect_emergency("I am vomiting blood")
    assert get_emergency_message(self_harm) == SELF_HARM_MESSAGE
    assert get_emergency_message(bleeding) == EMERGENCY_MESSAGE