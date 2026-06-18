import { viewportCenterBusySamplingArmAction } from "../app/_client/pure/globe/GlobeViewportCenterSampling";

describe("viewportCenterBusySamplingArmAction", () => {
  test("starts when user is rotating/zooming and sampling is inactive", () => {
    expect(
      viewportCenterBusySamplingArmAction({
        shouldContinueSampling: true,
        busySamplingActive: false,
        hasScheduledTick: false,
      }),
    ).toBe("start");
  });

  test("noops when the user is idle", () => {
    expect(
      viewportCenterBusySamplingArmAction({
        shouldContinueSampling: false,
        busySamplingActive: false,
        hasScheduledTick: false,
      }),
    ).toBe("noop");
  });

  test("rearms the timer when sampling is active but the tick was lost", () => {
    expect(
      viewportCenterBusySamplingArmAction({
        shouldContinueSampling: true,
        busySamplingActive: true,
        hasScheduledTick: false,
      }),
    ).toBe("rearm_timer");
  });

  test("noops when sampling is already scheduled", () => {
    expect(
      viewportCenterBusySamplingArmAction({
        shouldContinueSampling: true,
        busySamplingActive: true,
        hasScheduledTick: true,
      }),
    ).toBe("noop");
  });
});
