import type { LatLong } from "../BathroomDataPrimary";

export const BATHROOM_ACTIVE_NAVIGATION_STORAGE_KEY =
  "bathhub_bathroom_active_navigation_v1" as const;

export type PersistedPathPoint = LatLong;

export type PersistedBathroomActiveNavigation = {
  targetBathroomId: number;
  targetLatitude: number;
  targetLongitude: number;
  /** Client location when the Find bathroom flow started (spec path-update origin). */
  findOriginLatitude?: number;
  findOriginLongitude?: number;
  /** Last successfully rendered path; kept so paused navigation can redraw after reload. */
  lastPathPoints?: readonly PersistedPathPoint[];
};

function parsePersistedPathPoints(raw: unknown): readonly PersistedPathPoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points: PersistedPathPoint[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return undefined;
    const latitude = (item as { latitude?: unknown }).latitude;
    const longitude = (item as { longitude?: unknown }).longitude;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return undefined;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return undefined;
    }
    points.push({ latitude, longitude });
  }
  return points.length > 0 ? points : undefined;
}

export function parsePersistedBathroomActiveNavigation(
  raw: string,
): PersistedBathroomActiveNavigation | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const targetBathroomId = parsed.targetBathroomId;
    const targetLatitude = parsed.targetLatitude;
    const targetLongitude = parsed.targetLongitude;
    if (
      typeof targetBathroomId !== "number" ||
      typeof targetLatitude !== "number" ||
      typeof targetLongitude !== "number"
    ) {
      return null;
    }
    if (
      !Number.isFinite(targetBathroomId) ||
      !Number.isFinite(targetLatitude) ||
      !Number.isFinite(targetLongitude)
    ) {
      return null;
    }
    const findOriginLatitude = parsed.findOriginLatitude;
    const findOriginLongitude = parsed.findOriginLongitude;
    const hasOrigin =
      typeof findOriginLatitude === "number" &&
      typeof findOriginLongitude === "number" &&
      Number.isFinite(findOriginLatitude) &&
      Number.isFinite(findOriginLongitude);
    const lastPathPoints = parsePersistedPathPoints(parsed.lastPathPoints);
    if (parsed.lastPathPoints !== undefined && lastPathPoints === undefined) {
      return null;
    }
    return {
      targetBathroomId,
      targetLatitude,
      targetLongitude,
      ...(hasOrigin
        ? {
            findOriginLatitude,
            findOriginLongitude,
          }
        : {}),
      ...(lastPathPoints ? { lastPathPoints } : {}),
    };
  } catch {
    return null;
  }
}

export function serializePersistedBathroomActiveNavigation(
  value: PersistedBathroomActiveNavigation,
): string {
  return JSON.stringify(value);
}

export type BathroomActiveNavigationStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function readBathroomActiveNavigation(
  storage: BathroomActiveNavigationStorage,
): PersistedBathroomActiveNavigation | null {
  const raw = storage.getItem(BATHROOM_ACTIVE_NAVIGATION_STORAGE_KEY);
  if (!raw) return null;
  return parsePersistedBathroomActiveNavigation(raw);
}

export function writeBathroomActiveNavigation(
  storage: BathroomActiveNavigationStorage,
  value: PersistedBathroomActiveNavigation | null,
): void {
  if (value === null) {
    storage.removeItem(BATHROOM_ACTIVE_NAVIGATION_STORAGE_KEY);
    return;
  }
  storage.setItem(
    BATHROOM_ACTIVE_NAVIGATION_STORAGE_KEY,
    serializePersistedBathroomActiveNavigation(value),
  );
}

export function withPersistedLastPathPoints(
  navigation: PersistedBathroomActiveNavigation,
  points: readonly LatLong[],
): PersistedBathroomActiveNavigation {
  return {
    ...navigation,
    lastPathPoints: points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })),
  };
}

/** Persists path points to storage without triggering React state updates. */
export function persistLastPathPointsToStorage(
  storage: BathroomActiveNavigationStorage,
  points: readonly LatLong[],
): void {
  const current = readBathroomActiveNavigation(storage);
  if (!current) return;
  writeBathroomActiveNavigation(storage, withPersistedLastPathPoints(current, points));
}

/** Reads persisted active navigation when browser storage is available. */
export function readInitialBathroomActiveNavigationFromWindow(): PersistedBathroomActiveNavigation | null {
  if (typeof window === "undefined") return null;
  try {
    return readBathroomActiveNavigation(window.localStorage);
  } catch {
    return null;
  }
}

/** Path-update tracker origin: Find-bathroom start location when persisted, else current. */
export function pathUpdateTrackerOriginLocation(
  navigation: PersistedBathroomActiveNavigation,
  currentLocation: LatLong,
): LatLong {
  const { findOriginLatitude, findOriginLongitude } = navigation;
  if (
    typeof findOriginLatitude === "number" &&
    typeof findOriginLongitude === "number" &&
    Number.isFinite(findOriginLatitude) &&
    Number.isFinite(findOriginLongitude)
  ) {
    return { latitude: findOriginLatitude, longitude: findOriginLongitude };
  }
  return currentLocation;
}
