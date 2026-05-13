import type * as CesiumTypes from "cesium";

import * as Utils from "../Utils";
import type { MapMarkerCachedViewportCenter } from "./MapMarker";
import { installGlobeImage } from "./GlobeImage";
import { DebugCrosshair as DebugCrosshairConsts } from "../ComponentConstants";
import { linearProgress01 } from "./pure/DebugCrosshair";

export type DebugCrosshairHandle = {
  /** Invoke after `viewportCenterLatLonRef` was updated from a successful viewport-center computation. */
  notifyViewportCenterSampled: () => void;
  destroy: () => void;
};

/**
 * Debug overlay: draws crosshairs at the viewport-center ground point (same source as MapMarker when
 * geolocation is unavailable). Anchor is billboard center (true midpoint), unlike MapMarker’s bottom-center pin.
 */
export function installDebugCrosshair(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
  getCachedViewportCenter: MapMarkerCachedViewportCenter,
): DebugCrosshairHandle | null {
  if (!DebugCrosshairConsts.ENABLED) {
    return null;
  }
  
  const globeImage = installGlobeImage(Cesium, viewer, {
    name: "DebugCrosshair",
    color: DebugCrosshairConsts.BASE_COLOR,
    opacity: 1,
    image: DebugCrosshairConsts.IMAGE,
    size: DebugCrosshairConsts.SIZE,
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.CENTER,
  });

  let cancelled = false;
  let rafId: number | null = null;
  let sampleStartMs = 0;

  const stopRaf = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = () => {
    if (cancelled) return;
    const now = performance.now();
    const elapsed = now - sampleStartMs;

    const blendT =
      DebugCrosshairConsts.BLEND_OUT_COLORS_MS <= 0
        ? 1
        : linearProgress01(elapsed, DebugCrosshairConsts.BLEND_OUT_COLORS_MS);
    const fadeT =
      DebugCrosshairConsts.FADE_OUT_MS <= 0 ? 1 : linearProgress01(elapsed, DebugCrosshairConsts.FADE_OUT_MS);

    const colorHex = Utils.lerpHex(
      DebugCrosshairConsts.SECONDARY_COLOR,
      DebugCrosshairConsts.BASE_COLOR,
      blendT,
    );
    const opacity = 1 - fadeT;

    if (opacity <= 0 || fadeT >= 1) {
      globeImage.setBillboardTint(DebugCrosshairConsts.BASE_COLOR, 0);
      globeImage.setVisible(false);
      stopRaf();
      return;
    }

    globeImage.setBillboardTint(colorHex, opacity);
    rafId = requestAnimationFrame(tick);
  };

  const notifyViewportCenterSampled = () => {
    if (cancelled) return;
    const p = getCachedViewportCenter();
    if (!p) return;

    stopRaf();

    globeImage.setLatLonDegrees(p.latitude, p.longitude);
    globeImage.setVisible(true);
    sampleStartMs = performance.now();
    globeImage.setBillboardTint(DebugCrosshairConsts.SECONDARY_COLOR, 1);
    rafId = requestAnimationFrame(tick);
  };

  return {
    notifyViewportCenterSampled,
    destroy: () => {
      cancelled = true;
      stopRaf();
      globeImage.destroy();
    },
  };
}
