"use client";

import { USER_SETTINGS_DEFAULT_DB_API_PATH } from "@/app/_shared/user-settings/DefaultUserSettingsDbPaths";

export async function fetchDefaultUserSettingsDbBytes(): Promise<Uint8Array | null> {
  try {
    const response = await fetch(USER_SETTINGS_DEFAULT_DB_API_PATH, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return null;
    }

    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}
