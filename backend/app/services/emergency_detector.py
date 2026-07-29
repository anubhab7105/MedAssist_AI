"""
Emergency detection.

This runs on every symptom-checker submission and every chat message
BEFORE anything is sent to Groq. If a red-flag pattern is matched, the AI
call is skipped entirely and the user is shown an emergency banner
instead. This is a deliberately blunt, high-recall keyword/phrase layer —
false positives (over-triggering) are the safe failure mode here, not
false negatives.
"""

import re
from dataclasses import dataclass


@dataclass
class EmergencyMatch:
    triggered: bool
    matched_categories: list[str]


# Each category maps to a list of regex patterns (case-insensitive).
# Patterns are intentionally broad phrases rather than single words to
# balance recall against nuisance-triggering on unrelated text.
_EMERGENCY_PATTERNS: dict[str, list[str]] = {
    "chest_pain": [
        r"\bchest pain\b",
        r"\bcrushing (feeling|pressure|pain)\b.*\bchest\b",
        r"\btightness in (my |the )?chest\b",
        r"\bpain (radiating|spreading) (to|down) (my |the )?(arm|jaw)\b",
    ],
    "stroke": [
        r"\bface (is )?droop",
        r"\bslurred speech\b",
        r"\bsudden (numbness|weakness)\b",
        r"\bcan'?t (move|feel) (one|my) (side|arm|leg)\b",
        r"\bsudden confusion\b",
        r"\bworst headache of my life\b",
    ],
    "breathing": [
        r"\b(difficulty|trouble|can'?t) breath(e|ing)\b",
        r"\bshort(ness)? of breath\b",
        r"\bgasping for air\b",
        r"\bturning blue\b",
        r"\blips (are |turning )?blue\b",
    ],
    "bleeding": [
        r"\b(heavy|severe|uncontrolled|won'?t stop) bleeding\b",
        r"\bbleeding (that )?(won'?t|will not) stop\b",
        r"\bblood (is )?spurting\b",
        r"\bvomiting blood\b",
        r"\bcoughing (up )?blood\b",
    ],
    "unconsciousness": [
        r"\bunconscious\b",
        r"\bnot (waking up|responding|responsive)\b",
        r"\bpassed out\b",
        r"\bfainted\b.*\b(not|won'?t) wake\b",
        r"\bunresponsive\b",
    ],
    "seizure": [
        r"\bseizure\b",
        r"\bconvulsing\b",
        r"\bconvulsions?\b",
        r"\bshaking uncontrollably\b",
    ],
    "self_harm": [
        r"\bsuicid",
        r"\bkill myself\b",
        r"\bwant to die\b",
        r"\bself[\s-]?harm\b",
    ],
}

_COMPILED = {
    category: [re.compile(p, re.IGNORECASE) for p in patterns]
    for category, patterns in _EMERGENCY_PATTERNS.items()
}

EMERGENCY_MESSAGE = (
    "🚨 Seek immediate emergency medical attention. Based on what you've "
    "described, this may be a medical emergency. Please call your local "
    "emergency number or go to the nearest emergency room right away. "
    "This assistant cannot help with emergencies and has not generated "
    "an AI response for this message."
)

# India-specific default; the frontend can localize this per the user's
# detected region if that's ever added.
EMERGENCY_NUMBER_HINT = "In India, call 112 for emergency services."

SELF_HARM_MESSAGE = (
    "🚨 If you're in immediate danger, please call 112 (India) or your "
    "local emergency number now. You can also reach a crisis line for "
    "free, confidential support: iCall (+91 9152987821) or the Kiran "
    "Mental Health Helpline (1800-599-0019), available 24/7. You deserve "
    "support, and a trained person is ready to help right now. This "
    "assistant cannot provide crisis counseling."
)


def detect_emergency(text: str) -> EmergencyMatch:
    matched: list[str] = []
    for category, patterns in _COMPILED.items():
        if any(p.search(text) for p in patterns):
            matched.append(category)
    return EmergencyMatch(triggered=bool(matched), matched_categories=matched)


def get_emergency_message(match: EmergencyMatch) -> str:
    """Self-harm matches get crisis-line messaging instead of the generic
    'go to the ER' copy — the right next step is different."""
    if "self_harm" in match.matched_categories:
        return SELF_HARM_MESSAGE
    return EMERGENCY_MESSAGE
