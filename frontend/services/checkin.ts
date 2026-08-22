import { api } from "@/lib/api";
import type { CheckInResponse, RecoveryActivityResponse } from "@/types";

export async function getRecoveryActivity(
  context: string
): Promise<RecoveryActivityResponse> {
  const { data } = await api.get("/api/v1/checkin/recovery-activity", {
    params: { context },
  });
  return data;
}
