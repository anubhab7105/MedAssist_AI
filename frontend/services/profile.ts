import { api } from "@/lib/api";
import type { Gender, UserProfile } from "@/types";

export interface ProfileUpdatePayload {
  full_name?: string;
  medical_history?: string;
  age?: number;
  gender?: Gender;
  weight_kg?: number;
  height_cm?: number;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get("/api/v1/profile");
  return data;
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<UserProfile> {
  const { data } = await api.put("/api/v1/profile", payload);
  return data;
}

export async function getChatHistory(limit = 50) {
  const { data } = await api.get(`/api/v1/profile/chat-history?limit=${limit}`);
  return data;
}

export async function getSymptomHistory(limit = 50) {
  const { data } = await api.get(`/api/v1/profile/symptom-history?limit=${limit}`);
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete("/api/v1/profile/account");
  return data;
}
