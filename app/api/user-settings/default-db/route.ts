import {
  enforceServerRateLimit,
  RateLimitExceededError,
} from "@/app/_server/rate-limit/enforceRateLimit";
import { getDefaultUserSettingsDbSnapshotBytes } from "@/app/_server/user-settings/getDefaultUserSettingsDbSnapshotBytes";

export async function GET() {
  try {
    await enforceServerRateLimit("user-settings-default-db");
    const bytes = await getDefaultUserSettingsDbSnapshotBytes();
    return new Response(Uint8Array.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return new Response(error.message, { status: 429 });
    }
    return new Response("Default user settings database is unavailable.", {
      status: 503,
    });
  }
}
