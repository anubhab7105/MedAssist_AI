import { api } from "@/lib/api";

export async function getProfile() {
  const { data } = await api.get("/api/profile");
  return data;
}

export async function updateProfile(payload: { full_name?: string; medical_history?: string }) {
  const { data } = await api.put("/api/profile", payload);
  return data;
}

export async function getChatHistory(limit = 50) {
  const { data } = await api.get(`/api/profile/chat-history?limit=${limit}`);
  return data;
}

export async function getSymptomHistory(limit = 50) {
  const { data } = await api.get(`/api/profile/symptom-history?limit=${limit}`);
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete("/api/profile/account");
  return data;
}
