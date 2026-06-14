"use client";

import type { UserSettingsRow } from "@/app/_shared/user-settings/UserSettingsSchema";
import { useUserSettings } from "./UserSettingsContext";

export function useUserSettingsValues(): {
  settings: UserSettingsRow | null;
  refresh: () => Promise<void>;
  setBoolean: (
    column: "globe_movement_smooth",
    value: boolean,
  ) => Promise<void>;
  setInt: (
    column: "camera_init_surface_offset_m" | "find_nearest_bathroom_max_dist_m",
    value: number,
  ) => Promise<void>;
} {
  const { settings, refresh, setBoolean, setInt } = useUserSettings();
  return { settings, refresh, setBoolean, setInt };
}
