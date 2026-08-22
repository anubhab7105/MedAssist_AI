import { api } from "@/lib/api";
import type { CheckInResponse, RecoveryActivityResponse } from "@/types";

export async function postCheckIn(text: string): Promise<CheckInResponse> {
  const { data } = await api.post("/api/v1/checkin", { text });
  return data;
}

export async function getRecoveryActivity(
  context: string
): Promise<RecoveryActivityResponse> {
  const { data } = await api.get("/api/v1/checkin/recovery-activity", {
    params: { context },
  });
  return data;
}
