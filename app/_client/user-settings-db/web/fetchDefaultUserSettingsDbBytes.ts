"use client";

import { USER_SETTINGS_DEFAULT_DB_API_PATH } from "@/app/_shared/user-settings/DefaultUserSettingsDbPaths";

export type FetchDefaultUserSettingsDbResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "rate_limited"; errorMsg: string }
  | { ok: false; reason: "fetch_failed" };

export async function fetchDefaultUserSettingsDbBytes(): Promise<FetchDefaultUserSettingsDbResult> {
  try {
    const response = await fetch(USER_SETTINGS_DEFAULT_DB_API_PATH, {
      cache: "no-store",
    });
    if (response.status === 429) {
      return {
        ok: false,
        reason: "rate_limited",
        errorMsg: await response.text(),
      };
    }
    if (!response.ok) {
      return { ok: false, reason: "fetch_failed" };
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return { ok: false, reason: "fetch_failed" };
    }

    return { ok: true, bytes: new Uint8Array(buffer) };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
}
