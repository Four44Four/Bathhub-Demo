import { shouldNotifyCameraMotionIdleOnSamplerSettled } from "../app/_client/pure/globe/GlobeViewportCameraMotionIdle";

describe("shouldNotifyCameraMotionIdleOnSamplerSettled", () => {
  test("does not notify before pointer idle", () => {
    expect(
      shouldNotifyCameraMotionIdleOnSamplerSettled({
        pointerIdle: false,
        wheelZoomFromUserInput: false,
        pointerIdleAlreadyNotified: false,
      }),
    ).toBe(false);
  });

  test("does not notify when user wheel smoothing ends after pointer idle already fired", () => {
    expect(
      shouldNotifyCameraMotionIdleOnSamplerSettled({
        pointerIdle: true,
        wheelZoomFromUserInput: true,
        pointerIdleAlreadyNotified: true,
      }),
    ).toBe(false);
  });

  test("notifies when programmatic zoom settles while pointer is idle", () => {
    expect(
      shouldNotifyCameraMotionIdleOnSamplerSettled({
        pointerIdle: true,
        wheelZoomFromUserInput: false,
        pointerIdleAlreadyNotified: true,
      }),
    ).toBe(true);
  });

  test("notifies on motion settle when pointer is idle and user wheel smoothing never ran", () => {
    expect(
      shouldNotifyCameraMotionIdleOnSamplerSettled({
        pointerIdle: true,
        wheelZoomFromUserInput: false,
        pointerIdleAlreadyNotified: false,
      }),
    ).toBe(true);
  });
});
