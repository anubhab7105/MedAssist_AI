"""
Emergency detection (two-stage).

Runs on every symptom-checker submission and every chat message BEFORE
anything is sent to Groq. If a red-flag pattern survives both stages, the
AI call is skipped entirely and the user is shown an emergency banner
instead.

Stage 1 — Pattern match: broad, deliberate high-recall regex layer.
Stage 2 — Contextual filter: checks the sentence around each match for
negation ("no", "not", "denies"), past/historical phrasing, or
hypotheticals ("what if", "does ... mean") and suppresses matches that
are clearly not describing an ongoing emergency. This is a deterministic
surrogate for a classifier — every suppression rule is explicit,
unit-testable, and biased toward the safe failure mode (keep the
emergency banner when in doubt).
"""

import re
from dataclasses import dataclass, field

# Weight for a category that survives the contextual filter.
CONFIRMED_CONFIDENCE = 0.9


@dataclass
class EmergencyMatch:
    triggered: bool
    matched_categories: list[str]
    confidence: float = 0.0
    suppressed: list[str] = field(default_factory=list)


# Each category maps to a list of regex patterns (case-insensitive).
# Patterns are intentionally broad phrases rather than single words to
# balance recall against nuisance-triggering on unrelated text.
_EMERGENCY_PATTERNS: dict[str, list[str]] = {
    "chest_pain": [
        r"\bchest pain\b",
        r"\bcrushing (feeling|pressure|pain)\b.*\bchest\b",
        r"\btightness in (my |the |your |his |her |their |our )?chest\b",
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

# Stage 2 vocabulary -------------------------------------------------------

# Words/phrases that clearly negate the symptom when near a match.
_NEGATION_TERMS = (
    r"\bno\b", r"\bnot\b", r"\bnever\b", r"\bwithout\b", r"\bdenies\b",
    r"\bdenied\b", r"\bdoesn'?t\b", r"\bdon'?t\b", r"\bdidn'?t\b",
    r"\bisn'?t\b", r"\bwasn'?t\b", r"\bno longer\b", r"\bhardly\b",
    r"\bunlikely to\b",
)
_NEGATION_RE = re.compile("|".join(_NEGATION_TERMS), re.IGNORECASE)

# Historical/past phrasing — "I had chest pain last year" is not a 911 call.
# Deliberately conservative. Bare "had" is excluded on purpose: "my son had
# a seizure two minutes ago" is an acute emergency, not a memory. Only
# unambiguous past markers trigger suppression.
_PAST_TERMS = (
    r"\bhistory of\b", r"\bin the past\b",
    r"\blast (year|month|week|night|time)\b", r"\bwhen i was\b",
    r"\bprevious\b", r"\bused to\b", r"\brecovered\b", r"\bmonths? ago\b",
    r"\byears? ago\b",
)
_PAST_RE = re.compile("|".join(_PAST_TERMS), re.IGNORECASE)

# Hypotheticals / questions — "what if I have chest pain?" is not an emergency.
_HYPOTHETICAL_TERMS = (
    r"\bwhat if\b", r"\bsuppose\b", r"\bimagine\b", r"\bhypothetical\b",
    r"\bhypothetically\b", r"\bpretend\b", r"\bscenario\b", r"\bexample\b",
    r"\bif i (had|have|get)\b", r"\bwould\b", r"\bcould\b", r"\bmight\b",
    r"\bdoes .*\bmean\b", r"\bshould i\b", r"\bask\b", r"\basked\b",
    r"\bwondering\b", r"\bcurious\b", r"\bis it (normal|bad|serious|dangerous)\b",
)
_HYPOTHETICAL_RE = re.compile("|".join(_HYPOTHETICAL_TERMS), re.IGNORECASE)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")

# Contrast markers split clauses: in "No chest pain, but I have trouble
# breathing", the negation only governs the first clause.
_CONTRAST_RE = re.compile(r"\b(but|however|yet|although|though)\b", re.IGNORECASE)

# Self-harm is intentionally NOT suppressible: any mention, even
# hypothetical, gets the crisis message.
_NON_SUPPRESSIBLE = {"self_harm"}


def _clause_of(sentence: str, match_end: int) -> str:
    """The clause that governs a match: the sentence prefix up to the
    match, cut at the last contrast marker (negation/past only bind
    within one clause)."""
    prefix = sentence[:match_end]
    parts = _CONTRAST_RE.split(prefix)
    return parts[-1]


def _context_suppresses(sentence: str, match_end: int) -> bool:
    """Stage 2: decide whether a matched phrase describes an ongoing
    emergency or is negated / historical / hypothetical."""
    clause = _clause_of(sentence, match_end)
    if _NEGATION_RE.search(clause):
        return True
    if _PAST_RE.search(clause):
        return True
    if _HYPOTHETICAL_RE.search(sentence):
        return True
    return False


def detect_emergency(text: str) -> EmergencyMatch:
    """Two-stage detection: regex recall first, contextual precision second."""
    raw_matches: dict[str, list[re.Match]] = {}
    for category, patterns in _COMPILED.items():
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                raw_matches.setdefault(category, []).append(match)
                break  # one pattern per category is enough to record it

    if not raw_matches:
        return EmergencyMatch(triggered=False, matched_categories=[])

    sentences = _SENTENCE_SPLIT_RE.split(text)
    confirmed: list[str] = []
    suppressed: list[str] = []

    for category, matches in raw_matches.items():
        if category in _NON_SUPPRESSIBLE:
            confirmed.append(category)
            continue

        # The category fires unless every governing clause suppresses it.
        contexts = [
            (sentence, match.end())
            for sentence in sentences
            for match in matches
            if match.group(0).lower() in sentence.lower()
        ] or [(sentence, sentence.find(matches[0].group(0)) + len(matches[0].group(0))) for sentence in sentences]

        if any(not _context_suppresses(*ctx) for ctx in contexts):
            confirmed.append(category)
        else:
            suppressed.append(category)

    if not confirmed:
        return EmergencyMatch(
            triggered=False,
            matched_categories=[],
            suppressed=suppressed,
        )

    confidence = CONFIRMED_CONFIDENCE * (1 + 0.05 * (len(confirmed) - 1))
    return EmergencyMatch(
        triggered=True,
        matched_categories=confirmed,
        confidence=min(confidence, 1.0),
        suppressed=suppressed,
    )


def get_emergency_message(match: EmergencyMatch) -> str:
    """Self-harm matches get crisis-line messaging instead of the generic
    'go to the ER' copy — the right next step is different."""
    if "self_harm" in match.matched_categories:
        return SELF_HARM_MESSAGE
    return EMERGENCY_MESSAGE


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