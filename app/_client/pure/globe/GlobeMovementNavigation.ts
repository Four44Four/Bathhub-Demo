import type { GlobeViewportHandle } from "../../globe/GlobeViewport";

export type NavigateGlobeToLatLonDeps = {
  globe: Pick<
    GlobeViewportHandle,
    | "animateTo"
    | "animateZoomToInitTarget"
    | "beginGeoArrivalInteractionLock"
    | "snapTo"
    | "snapZoomToInitTarget"
    | "subscribeCameraMotionIdle"
    | "isGlobeViewportSamplerBusy"
  > | null;
  globeMovementSmooth: boolean;
  animationDurationMs: number;
};

/** Centers the globe on (lat, long) with smooth animation or an instant snap. */
export function navigateGlobeToLatLon(
  deps: NavigateGlobeToLatLonDeps,
  lat: number,
  long: number,
  onArrival?: () => void,
): void {
  const { globe, globeMovementSmooth, animationDurationMs } = deps;
  if (!globe) return;

  if (globeMovementSmooth) {
    globe.beginGeoArrivalInteractionLock();
    globe.animateTo(lat, long, animationDurationMs);
    globe.animateZoomToInitTarget(animationDurationMs);
    if (onArrival) {
      const unsubscribe = globe.subscribeCameraMotionIdle(() => {
        unsubscribe();
        onArrival();
      });
      if (!globe.isGlobeViewportSamplerBusy()) {
        unsubscribe();
        onArrival();
      }
    }
    return;
  }

  globe.snapTo(lat, long);
  globe.snapZoomToInitTarget();
  onArrival?.();
}
