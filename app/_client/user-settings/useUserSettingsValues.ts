"use client";

import type {
  UserSettingsBooleanColumnName,
  UserSettingsNumericColumnName,
} from "@/app/_shared/user-settings/UserSettingsPageDefinition";
import type { UserSettingsRow } from "@/app/_shared/user-settings/UserSettingsSchema";
import { useUserSettings } from "./UserSettingsContext";

export function useUserSettingsValues(): {
  settings: UserSettingsRow | null;
  setPendingBoolean: (
    column: UserSettingsBooleanColumnName,
    value: boolean,
  ) => void;
  setPendingInt: (
    column: UserSettingsNumericColumnName,
    value: number,
  ) => void;
} {
  const { pendingSettings, setPendingBoolean, setPendingInt } = useUserSettings();
  return {
    settings: pendingSettings,
    setPendingBoolean,
    setPendingInt,
  };
}
