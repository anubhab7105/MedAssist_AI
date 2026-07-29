import { api } from "@/lib/api";
import type { SymptomCheckRequest, SymptomCheckResponse } from "@/types";

export async function checkSymptoms(
  payload: SymptomCheckRequest
): Promise<SymptomCheckResponse> {
  const { data } = await api.post("/api/symptom-checker", {
    age: payload.age,
    gender: payload.gender,
    weight_kg: payload.weightKg,
    height_cm: payload.heightCm,
    symptoms: payload.symptoms,
    duration: payload.duration,
    pain_level: payload.painLevel,
    temperature_celsius: payload.temperatureCelsius,
    current_medication: payload.currentMedication,
    known_diseases: payload.knownDiseases,
    allergies: payload.allergies,
  });

  return {
    isEmergency: data.is_emergency,
    emergencyMessage: data.emergency_message,
    symptomSummary: data.symptom_summary,
    possibleConditions: data.possible_conditions,
    severity: data.severity,
    lifestyleSuggestions: data.lifestyle_suggestions,
    emergencyWarnings: data.emergency_warnings,
    recommendedSpecialist: data.recommended_specialist,
    disclaimer: data.disclaimer,
  };
}
