/**
 * Whether sampler/camera motion settling should notify camera-motion-idle subscribers.
 * User wheel smoothing that ends after pointer-idle already fired must not notify again.
 */
export function shouldNotifyCameraMotionIdleOnSamplerSettled(params: {
  pointerIdle: boolean;
  /** Still true after user wheel input until the next programmatic zoom animation. */
  wheelZoomFromUserInput: boolean;
  /** True once pointer-idle already notified subscribers for this input session. */
  pointerIdleAlreadyNotified: boolean;
}): boolean {
  const { pointerIdle, wheelZoomFromUserInput, pointerIdleAlreadyNotified } = params;
  if (!pointerIdle) return false;
  if (pointerIdleAlreadyNotified && wheelZoomFromUserInput) return false;
  return true;
}
