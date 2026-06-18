import { navigateGlobeToLatLon } from "../app/_client/pure/globe/GlobeMovementNavigation";

describe("navigateGlobeToLatLon", () => {
  test("smooth on uses animation + interaction lock", () => {
    const globe = {
      beginGeoArrivalInteractionLock: jest.fn(),
      animateTo: jest.fn(),
      animateZoomToInitTarget: jest.fn(),
      snapTo: jest.fn(),
      snapZoomToInitTarget: jest.fn(),
      subscribeCameraMotionIdle: jest.fn(() => () => {}),
      isGlobeViewportSamplerBusy: jest.fn(() => false),
    };

    navigateGlobeToLatLon(
      { globe, globeMovementSmooth: true, animationDurationMs: 1500 },
      51.5,
      -0.12,
    );

    expect(globe.beginGeoArrivalInteractionLock).toHaveBeenCalledTimes(1);
    expect(globe.animateTo).toHaveBeenCalledWith(51.5, -0.12, 1500);
    expect(globe.animateZoomToInitTarget).toHaveBeenCalledWith(1500);
    expect(globe.snapTo).not.toHaveBeenCalled();
    expect(globe.snapZoomToInitTarget).not.toHaveBeenCalled();
  });

  test("smooth off snaps immediately without re-init", () => {
    const globe = {
      beginGeoArrivalInteractionLock: jest.fn(),
      animateTo: jest.fn(),
      animateZoomToInitTarget: jest.fn(),
      snapTo: jest.fn(),
      snapZoomToInitTarget: jest.fn(),
      subscribeCameraMotionIdle: jest.fn(() => () => {}),
      isGlobeViewportSamplerBusy: jest.fn(() => false),
    };

    navigateGlobeToLatLon(
      { globe, globeMovementSmooth: false, animationDurationMs: 1500 },
      40.7,
      -74.0,
    );

    expect(globe.snapTo).toHaveBeenCalledWith(40.7, -74.0);
    expect(globe.snapZoomToInitTarget).toHaveBeenCalledTimes(1);
    expect(globe.beginGeoArrivalInteractionLock).not.toHaveBeenCalled();
    expect(globe.animateTo).not.toHaveBeenCalled();
    expect(globe.animateZoomToInitTarget).not.toHaveBeenCalled();
  });

  test("no-op when globe handle is missing", () => {
    expect(() =>
      navigateGlobeToLatLon(
        { globe: null, globeMovementSmooth: true, animationDurationMs: 1500 },
        0,
        0,
      ),
    ).not.toThrow();
  });
});
