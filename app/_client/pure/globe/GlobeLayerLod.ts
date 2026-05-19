import * as Utils from "../../Utils";

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
  return Utils.linearCrossfade01(
    heightM,
    thresholds.detailFadeStartM,
    thresholds.detailFullyVisibleM,
  );
}

export function streetLayerAlphaFromCameraHeightM(
  heightM: number,
  thresholds: GlobeLodThresholds = DEFAULT_THRESHOLDS,
): number {
  return Utils.linearCrossfade01(
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

export type GlobeLodVisualState = {
  detailAlpha: number;
  detailShow: boolean;
  streetAlpha: number;
  streetShow: boolean;
  maximumScreenSpaceError: number;
  fxaaEnabled: boolean;
};

/** Pure LOD snapshot from camera altitude — safe to compute off the hot path and apply later. */
export function globeLodVisualStateFromCameraHeightM(
  heightM: number,
  thresholds: GlobeLodThresholds = DEFAULT_THRESHOLDS,
): GlobeLodVisualState {
  const detailAlpha = detailLayerAlphaFromCameraHeightM(heightM, thresholds);
  const streetAlpha = streetLayerAlphaFromCameraHeightM(heightM, thresholds);
  return {
    detailAlpha,
    detailShow: detailAlpha > 0,
    streetAlpha,
    streetShow: streetAlpha > 0,
    maximumScreenSpaceError: globeMaximumScreenSpaceErrorFromHeightM(heightM, thresholds),
    fxaaEnabled: !fxaaEnabledFromCameraHeightM(heightM, thresholds.streetFadeStartM),
  };
}
