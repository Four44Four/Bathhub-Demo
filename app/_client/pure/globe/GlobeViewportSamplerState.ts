/**
 * True while viewport-center sampling should keep ticking.
 * Independent from pointer-idle: continues through wheel/rotate smoothing after input stops
 * (see specifications/GlobeViewport.md lines 22–27).
 */
export function shouldContinueGlobeViewportCenterSampling(params: {
  pointersDownCount: number;
  wheelZoomActive: boolean;
  /** Retained for callers that gate pointer-idle notifications; not used for sampling. */
  wheelZoomFromUserInput: boolean;
  /** Cesium pinch recognizer active (pointers may not both be tracked on all devices). */
  isPinching?: boolean;
  rotateAnimActive?: boolean;
}): boolean {
  const { pointersDownCount, wheelZoomActive, isPinching, rotateAnimActive } = params;
  if (isPinching === true) return true;
  return isGlobeViewportSamplerBusy({
    pointersDownCount,
    wheelZoomActive,
    rotateAnimActive: rotateAnimActive ?? false,
  });
}

/** True while any sampler-relevant camera motion is in flight (user or programmatic). */
export function isGlobeViewportSamplerBusy(params: {
  pointersDownCount: number;
  wheelZoomActive: boolean;
  rotateAnimActive: boolean;
}): boolean {
  const { pointersDownCount, wheelZoomActive, rotateAnimActive } = params;
  return pointersDownCount > 0 || wheelZoomActive || rotateAnimActive;
}
