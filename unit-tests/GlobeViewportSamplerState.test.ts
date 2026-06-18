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

  test("continues during any wheel smoothing (user or programmatic)", () => {
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
    ).toBe(true);
  });

  test("continues during an active Cesium pinch even with no tracked pointers", () => {
    expect(
      shouldContinueGlobeViewportCenterSampling({
        pointersDownCount: 0,
        wheelZoomActive: false,
        wheelZoomFromUserInput: false,
        isPinching: true,
      }),
    ).toBe(true);
  });

  test("continues during programmatic rotate smoothing when pointer-idle", () => {
    expect(
      shouldContinueGlobeViewportCenterSampling({
        pointersDownCount: 0,
        wheelZoomActive: false,
        wheelZoomFromUserInput: false,
        rotateAnimActive: true,
      }),
    ).toBe(true);
  });

  test("stops when pointer-idle and no smoothing animation is active", () => {
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
