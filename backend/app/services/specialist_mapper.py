"""
Lightweight keyword-based mapping from reported symptoms to a recommended
specialist type. This is used both as a fast local fallback and to give
Groq a hint in the prompt, so the AI's "Recommended Specialist" field
stays consistent with this list rather than inventing new titles.
"""

import re

_SPECIALIST_MAP: list[tuple[str, list[str]]] = [
    ("Neurologist", [r"headache", r"migraine", r"dizz", r"numbness", r"tingling", r"seizure", r"memory loss"]),
    ("Cardiologist", [r"chest pain", r"palpitat", r"heart", r"irregular heartbeat", r"high blood pressure"]),
    ("Dermatologist", [r"skin rash", r"\brash\b", r"acne", r"itch", r"eczema", r"mole", r"hives"]),
    ("Orthopedic", [r"joint pain", r"back pain", r"fracture", r"sprain", r"bone pain", r"knee pain", r"shoulder pain"]),
    ("Ophthalmologist", [r"eye pain", r"blurred vision", r"vision loss", r"red eye", r"eye discharge"]),
    ("Gastroenterologist", [r"stomach pain", r"abdominal pain", r"nausea", r"vomiting", r"diarrhea", r"constipation", r"acid reflux"]),
    ("ENT Specialist", [r"sore throat", r"ear pain", r"sinus", r"hearing loss", r"nasal congestion", r"tinnitus"]),
    ("Pulmonologist", [r"persistent cough", r"wheez", r"shortness of breath", r"asthma"]),
    ("Endocrinologist", [r"thyroid", r"diabetes", r"excessive thirst", r"unexplained weight"]),
    ("Psychiatrist", [r"anxiety", r"depress", r"panic attack", r"insomnia", r"trouble sleeping"]),
    ("General Physician", []),  # fallback, always matches last
]

_COMPILED = [
    (name, [re.compile(p, re.IGNORECASE) for p in patterns])
    for name, patterns in _SPECIALIST_MAP
]


def recommend_specialist(symptom_text: str) -> str:
    for name, patterns in _COMPILED:
        if not patterns:
            continue
        if any(p.search(symptom_text) for p in patterns):
            return name
    return "General Physician"
