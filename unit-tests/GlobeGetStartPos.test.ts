import { getStartPos } from "../app/_client/globe/GlobeViewport";
import type { GlobeViewportHandle } from "../app/_client/globe/GlobeViewport";

describe("getStartPos", () => {
  test("uses live MapMarker position when geolocation is granted and globe has a fix", () => {
    const globe = {
      getMapMarkerUserLatLon: () => ({
        latitude: 40.7,
        longitude: -74.0,
      }),
    } as GlobeViewportHandle;

    expect(getStartPos(globe, true, 12.5, -45.25)).toEqual({
      latitude: 40.7,
      longitude: -74.0,
    });
  });

  test("falls back to map init coordinates when geolocation is granted but no live fix yet", () => {
    const globe = {
      getMapMarkerUserLatLon: () => null,
    } as GlobeViewportHandle;

    expect(getStartPos(globe, true, 12.5, -45.25)).toEqual({
      latitude: 12.5,
      longitude: -45.25,
    });
    expect(getStartPos(null, true, 12.5, -45.25)).toEqual({
      latitude: 12.5,
      longitude: -45.25,
    });
  });

  test("uses viewport center when geolocation is not granted and globe is ready", () => {
    const globe = {
      getViewportCenterLatLon: () => ({
        latitude: 33.1,
        longitude: -118.2,
      }),
    } as GlobeViewportHandle;

    expect(getStartPos(globe, false, 0, 0)).toEqual({
      latitude: 33.1,
      longitude: -118.2,
    });
  });

  test("falls back to map init when geolocation is not granted and globe is unavailable", () => {
    expect(getStartPos(null, false, 0.5, -1.5)).toEqual({
      latitude: 0.5,
      longitude: -1.5,
    });
  });
});
