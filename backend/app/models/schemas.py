"""
Pydantic schemas shared across the API. Keeping every request/response
shape in one place makes it easy to keep the frontend `types/` folder in
sync — the two are meant to mirror each other field-for-field.
"""

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared enums
# ---------------------------------------------------------------------------

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class Severity(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    emergency = "emergency"


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessageIn(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return v.strip()


class ChatMessageOut(BaseModel):
    role: ChatRole
    content: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Symptom Checker
# ---------------------------------------------------------------------------

class SymptomCheckRequest(BaseModel):
    age: int = Field(..., ge=0, le=120)
    gender: Gender
    weight_kg: Optional[float] = Field(None, ge=1, le=400)
    height_cm: Optional[float] = Field(None, ge=30, le=272)
    symptoms: str = Field(..., min_length=3, max_length=2000)
    duration: str = Field(..., min_length=1, max_length=200)
    pain_level: int = Field(..., ge=0, le=10)
    temperature_celsius: Optional[float] = Field(None, ge=30, le=45)
    current_medication: Optional[str] = Field(None, max_length=1000)
    known_diseases: Optional[str] = Field(None, max_length=1000)
    allergies: Optional[str] = Field(None, max_length=1000)


class SymptomCheckResponse(BaseModel):
    is_emergency: bool
    emergency_message: Optional[str] = None
    symptom_summary: Optional[str] = None
    possible_conditions: Optional[list[str]] = None
    severity: Optional[Severity] = None
    lifestyle_suggestions: Optional[list[str]] = None
    emergency_warnings: Optional[list[str]] = None
    recommended_specialist: Optional[str] = None
    disclaimer: str = (
        "This information is educational only and should not replace "
        "professional medical advice."
    )


# ---------------------------------------------------------------------------
# Doctors / Places
# ---------------------------------------------------------------------------

class PlaceType(str, Enum):
    doctor = "doctor"
    hospital = "hospital"
    clinic = "clinic"
    pharmacy = "pharmacy"


class NearbyPlace(BaseModel):
    id: str
    name: str
    type: PlaceType
    latitude: float
    longitude: float
    distance_km: float
    address: Optional[str] = None
    phone: Optional[str] = None


class NearbyPlacesRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_meters: int = Field(20000, ge=500, le=100000)
    place_type: Optional[PlaceType] = None
    search: Optional[str] = Field(None, max_length=100)

    @field_validator("search")
    @classmethod
    def strip_search(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v or None


class NearbyPlacesResponse(BaseModel):
    places: list[NearbyPlace]


# ---------------------------------------------------------------------------
# Check-In / Recovery Mode
# ---------------------------------------------------------------------------

class CheckInRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class CheckInResponse(BaseModel):
    recovery_triggered: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    summary: str


class RecoveryActivityCategory(str, Enum):
    hydration = "hydration"
    rest = "rest"
    breathing = "breathing"
    stretching = "stretching"
    mindfulness = "mindfulness"
    nutrition = "nutrition"


class RecoveryActivityResponse(BaseModel):
    activity: str
    duration_minutes: int = Field(..., ge=1)
    category: RecoveryActivityCategory


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=120)
    medical_history: Optional[str] = Field(None, max_length=4000)
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[Gender] = None
    weight_kg: Optional[float] = Field(None, ge=1, le=400)
    height_cm: Optional[float] = Field(None, ge=30, le=272)
    is_recovery_mode: Optional[bool] = None
    daily_goal_target: Optional[int] = Field(None, ge=1)
    current_streak: Optional[int] = Field(None, ge=0)
    last_recovery_date: Optional[datetime] = None


class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    medical_history: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    is_recovery_mode: bool = False
    daily_goal_target: int = 8000
    current_streak: int = 0
    last_recovery_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
