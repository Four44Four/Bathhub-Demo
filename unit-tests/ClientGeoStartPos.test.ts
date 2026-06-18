import {
  isClientStartPosReadyForPathUpdate,
  readClientStartPos,
} from "../app/_client/pure/globe/ClientGeoStartPos";
import type { GlobeViewportHandle } from "../app/_client/globe/GlobeViewport";

describe("readClientStartPos", () => {
  test("delegates to getStartPos using the supplied client geo snapshot", () => {
    const globe = {
      getMapMarkerUserLatLon: () => ({
        latitude: 40.7,
        longitude: -74.0,
      }),
    } as GlobeViewportHandle;

    expect(
      readClientStartPos(globe, {
        isClientGeoGranted: true,
        mapInitLat: 12.5,
        mapInitLong: -45.25,
      }),
    ).toEqual({
      latitude: 40.7,
      longitude: -74.0,
    });
  });

  test("reads viewport center when geolocation is not granted", () => {
    const globe = {
      getViewportCenterLatLon: () => ({
        latitude: 33.1,
        longitude: -118.2,
      }),
    } as GlobeViewportHandle;

    expect(
      readClientStartPos(globe, {
        isClientGeoGranted: false,
        mapInitLat: 0,
        mapInitLong: 0,
      }),
    ).toEqual({
      latitude: 33.1,
      longitude: -118.2,
    });
  });
});
