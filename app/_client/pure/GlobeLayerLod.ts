import * as Utils from "../Utils";

/**
 * Linear crossfade 0→1 as `value` moves from `fadeStart` toward `fullyAt`.
 * (Used with camera height: farther = 0, closer = 1 when fadeStart > fullyAt.)
 */
export function linearCrossfade01(
  value: number,
  fadeStart: number,
  fullyAt: number,
): number {
  const t = (fadeStart - value) / (fadeStart - fullyAt);
  return Utils.clamp01(t);
}

export type GlobeLodThresholds = {
  detailFadeStartM: number;
  detailFullyVisibleM: number;
  streetFadeStartM: number;
  streetFullyVisibleM: number;
  superCloseM: number;
};

const DEFAULT_THRESHOLDS: GlobeLodThresholds = {
  detailFadeStartM: 8_000_000,
  detailFullyVisibleM: 1_500_000,
  streetFadeStartM: 35_000,
  streetFullyVisibleM: 2_500,
  superCloseM: 1_000,
};

export function detailLayerAlphaFromCameraHeightM(
  heightM: number,
  thresholds: GlobeLodThresholds = DEFAULT_THRESHOLDS,
): number {
  return linearCrossfade01(
    heightM,
    thresholds.detailFadeStartM,
    thresholds.detailFullyVisibleM,
  );
}

export function streetLayerAlphaFromCameraHeightM(
  heightM: number,
  thresholds: GlobeLodThresholds = DEFAULT_THRESHOLDS,
): number {
  return linearCrossfade01(
    heightM,
    thresholds.streetFadeStartM,
    thresholds.streetFullyVisibleM,
  );
}

export function globeMaximumScreenSpaceErrorFromHeightM(
  heightM: number,
  thresholds: GlobeLodThresholds = DEFAULT_THRESHOLDS,
): number {
  const h = heightM;
  if (h < thresholds.superCloseM) return 0.35;
  if (h < thresholds.streetFadeStartM) return 0.75;
  if (h < thresholds.detailFullyVisibleM) return 1.25;
  if (h < thresholds.detailFadeStartM) return 1.6;
  return 2.0;
}

export function fxaaEnabledFromCameraHeightM(
  heightM: number,
  streetFadeStartM: number = DEFAULT_THRESHOLDS.streetFadeStartM,
): boolean {
  return heightM >= streetFadeStartM;
}
