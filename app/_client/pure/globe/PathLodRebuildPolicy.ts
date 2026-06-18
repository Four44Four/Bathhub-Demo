/** True when two orbit center distances represent the same path LOD zoom level. */
export function pathLodOrbitCenterDistancesEqual(
  a: number,
  b: number,
  relativeEpsilon = 1e-6,
): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= scale * relativeEpsilon;
}

/**
 * Whether an idle client should schedule a path LOD geometry rebuild.
 * Skips when zoom (orbit center distance) is unchanged since the last rebuild.
 */
export function shouldSchedulePathLodRebuildOnIdle(params: {
  currentOrbitCenterDistanceM: number;
  lastRebuiltOrbitCenterDistanceM: number | null;
}): boolean {
  const { currentOrbitCenterDistanceM, lastRebuiltOrbitCenterDistanceM } =
    params;
  if (lastRebuiltOrbitCenterDistanceM === null) return true;
  return !pathLodOrbitCenterDistancesEqual(
    currentOrbitCenterDistanceM,
    lastRebuiltOrbitCenterDistanceM,
  );
}
