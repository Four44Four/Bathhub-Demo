"use client";

import { currentAccountAccessToken } from "@/app/_client/accounts/accountAccessToken";
import { USER_SETTINGS_DEFAULT_DB_API_PATH } from "@/app/_shared/user-settings/DefaultUserSettingsDbPaths";

export type FetchDefaultUserSettingsDbResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "rate_limited"; errorMsg: string }
  | { ok: false; reason: "fetch_failed" };

export async function fetchDefaultUserSettingsDbBytes(): Promise<FetchDefaultUserSettingsDbResult> {
  try {
    const accessToken = currentAccountAccessToken();
    const headers: Record<string, string> = {};
    if (accessToken !== null && accessToken.length > 0) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const response = await fetch(USER_SETTINGS_DEFAULT_DB_API_PATH, {
      cache: "no-store",
      headers,
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
