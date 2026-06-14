"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

import { USER_SETTINGS_DEFAULTS } from "@/app/_shared/user-settings/UserSettingsSchema";
import { useUserSettings } from "./UserSettingsContext";

export function resolveGlobeMovementSmooth(
  settings: { globe_movement_smooth: boolean } | null | undefined,
): boolean {
  return (
    settings?.globe_movement_smooth ?? USER_SETTINGS_DEFAULTS.globe_movement_smooth
  );
}

/** Latest `globe_movement_smooth` value for callbacks that must not close over stale settings. */
export function useGlobeMovementSmoothRef(): MutableRefObject<boolean> {
  const { settings } = useUserSettings();
  const globeMovementSmooth = resolveGlobeMovementSmooth(settings);
  const ref = useRef(globeMovementSmooth);

  useEffect(() => {
    ref.current = globeMovementSmooth;
  }, [globeMovementSmooth]);

  ref.current = globeMovementSmooth;
  return ref;
}
