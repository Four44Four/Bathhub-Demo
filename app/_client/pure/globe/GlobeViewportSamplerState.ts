/** True while user pointer/wheel input should drive repeated viewport-center sampling. */
export function shouldContinueGlobeViewportCenterSampling(params: {
  pointersDownCount: number;
  wheelZoomActive: boolean;
  wheelZoomFromUserInput: boolean;
}): boolean {
  const { pointersDownCount, wheelZoomActive, wheelZoomFromUserInput } = params;
  return pointersDownCount > 0 || (wheelZoomActive && wheelZoomFromUserInput);
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
