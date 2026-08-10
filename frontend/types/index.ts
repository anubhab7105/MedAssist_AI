export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type Severity = "low" | "moderate" | "high" | "emergency";
export type ChatRole = "user" | "assistant";
export type PlaceType = "doctor" | "hospital" | "clinic" | "pharmacy";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  isEmergency?: boolean;
}

export interface SymptomCheckRequest {
  age: number;
  gender: Gender;
  weightKg?: number;
  heightCm?: number;
  symptoms: string;
  duration: string;
  painLevel: number;
  temperatureCelsius?: number;
  currentMedication?: string;
  knownDiseases?: string;
  allergies?: string;
}

export interface SymptomCheckResponse {
  isEmergency: boolean;
  emergencyMessage?: string;
  symptomSummary?: string;
  possibleConditions?: string[];
  severity?: Severity;
  lifestyleSuggestions?: string[];
  emergencyWarnings?: string[];
  recommendedSpecialist?: string;
  disclaimer: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  medical_history?: string | null;
  age?: number | null;
  gender?: Gender | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface SymptomHistoryEntry {
  id: string;
  request_payload: SymptomCheckRequest;
  response_payload: SymptomCheckResponse;
  created_at: string;
}
