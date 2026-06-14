import type { GlobeViewportHandle } from "../../globe/GlobeViewport";

export type NavigateGlobeToLatLonDeps = {
  globe: Pick<
    GlobeViewportHandle,
    | "animateTo"
    | "animateZoomToInitTarget"
    | "beginGeoArrivalInteractionLock"
    | "snapTo"
    | "snapZoomToInitTarget"
  > | null;
  globeMovementSmooth: boolean;
  animationDurationMs: number;
};

/** Centers the globe on (lat, long) with smooth animation or an instant snap. */
export function navigateGlobeToLatLon(
  deps: NavigateGlobeToLatLonDeps,
  lat: number,
  long: number,
): void {
  const { globe, globeMovementSmooth, animationDurationMs } = deps;
  if (!globe) return;

  if (globeMovementSmooth) {
    globe.beginGeoArrivalInteractionLock();
    globe.animateTo(lat, long, animationDurationMs);
    globe.animateZoomToInitTarget(animationDurationMs);
    return;
  }

  globe.snapTo(lat, long);
  globe.snapZoomToInitTarget();
}
