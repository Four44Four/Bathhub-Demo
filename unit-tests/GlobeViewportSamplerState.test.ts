import {
  isGlobeViewportSamplerBusy,
  shouldContinueGlobeViewportCenterSampling,
} from "../app/_client/pure/globe/GlobeViewportSamplerState";

describe("shouldContinueGlobeViewportCenterSampling", () => {
  test("continues while a pointer is down", () => {
    expect(
      shouldContinueGlobeViewportCenterSampling({
        pointersDownCount: 1,
        wheelZoomActive: false,
        wheelZoomFromUserInput: false,
      }),
    ).toBe(true);
  });

  test("continues during user wheel smoothing only", () => {
    expect(
      shouldContinueGlobeViewportCenterSampling({
        pointersDownCount: 0,
        wheelZoomActive: true,
        wheelZoomFromUserInput: true,
      }),
    ).toBe(true);
    expect(
      shouldContinueGlobeViewportCenterSampling({
        pointersDownCount: 0,
        wheelZoomActive: true,
        wheelZoomFromUserInput: false,
      }),
    ).toBe(false);
  });

  test("does not continue for programmatic rotate-only motion", () => {
    expect(
      shouldContinueGlobeViewportCenterSampling({
        pointersDownCount: 0,
        wheelZoomActive: false,
        wheelZoomFromUserInput: false,
      }),
    ).toBe(false);
  });
});

describe("isGlobeViewportSamplerBusy", () => {
  test("busy during user input, user wheel smoothing, or programmatic motion", () => {
    expect(
      isGlobeViewportSamplerBusy({
        pointersDownCount: 1,
        wheelZoomActive: false,
        rotateAnimActive: false,
      }),
    ).toBe(true);
    expect(
      isGlobeViewportSamplerBusy({
        pointersDownCount: 0,
        wheelZoomActive: true,
        rotateAnimActive: false,
      }),
    ).toBe(true);
    expect(
      isGlobeViewportSamplerBusy({
        pointersDownCount: 0,
        wheelZoomActive: false,
        rotateAnimActive: true,
      }),
    ).toBe(true);
    expect(
      isGlobeViewportSamplerBusy({
        pointersDownCount: 0,
        wheelZoomActive: false,
        rotateAnimActive: false,
      }),
    ).toBe(false);
  });
});
