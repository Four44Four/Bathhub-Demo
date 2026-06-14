"use client";

import { useCallback, useEffect, useState } from "react";

import type { UserSettingsRow } from "@/app/_shared/user-settings/UserSettingsSchema";
import { getUserSettingsDb } from "../user-settings-db/web/UserSettingsDbWeb";

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
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);

  const refresh = useCallback(async () => {
    const db = getUserSettingsDb();
    await db.init();
    setSettings(await db.getSettings());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setBoolean = useCallback(
    async (column: "globe_movement_smooth", value: boolean) => {
      const db = getUserSettingsDb();
      await db.updateBooleanSetting(column, value);
      setSettings(await db.getSettings());
    },
    [],
  );

  const setInt = useCallback(
    async (
      column: "camera_init_surface_offset_m" | "find_nearest_bathroom_max_dist_m",
      value: number,
    ) => {
      const db = getUserSettingsDb();
      await db.updateIntSetting(column, value);
      setSettings(await db.getSettings());
    },
    [],
  );

  return { settings, refresh, setBoolean, setInt };
}
