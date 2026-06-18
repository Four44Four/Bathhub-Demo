/** How `ensureBusySampling` should react to user rotate/zoom activity. */
export type ViewportCenterBusySamplingArmAction = "start" | "rearm_timer" | "noop";

/**
 * Whether the viewport-center busy sampler should start or re-arm its delayed tick.
 * Re-arms when sampling is active but the timer was lost (e.g. after a race).
 */
export function viewportCenterBusySamplingArmAction(params: {
  shouldContinueSampling: boolean;
  busySamplingActive: boolean;
  hasScheduledTick: boolean;
}): ViewportCenterBusySamplingArmAction {
  const { shouldContinueSampling, busySamplingActive, hasScheduledTick } = params;
  if (!shouldContinueSampling) return "noop";
  if (!busySamplingActive) return "start";
  if (!hasScheduledTick) return "rearm_timer";
  return "noop";
}
