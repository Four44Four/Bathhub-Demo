import {
  computeViewportBoundsLatLon,
  pickViewportSurfaceLatLon,
  viewportBoundsFromCornerPicks,
} from "../app/_client/pure/globe/ViewportSurfacePick";

describe("ViewportSurfacePick", () => {
  test("viewportBoundsFromCornerPicks normalizes min/max lat/long", () => {
    expect(
      viewportBoundsFromCornerPicks(
        { latitude: 10, longitude: -5 },
        { latitude: 20, longitude: 5 },
      ),
    ).toEqual({
      lowerLeft: { latitude: 10, longitude: -5 },
      upperRight: { latitude: 20, longitude: 5 },
    });

    expect(
      viewportBoundsFromCornerPicks(
        { latitude: 20, longitude: 5 },
        { latitude: 10, longitude: -5 },
      ),
    ).toEqual({
      lowerLeft: { latitude: 10, longitude: -5 },
      upperRight: { latitude: 20, longitude: 5 },
    });
  });

  test("pickViewportSurfaceLatLon prefers pickPosition when supported", () => {
    const centerWorld = { id: "center" };
    const point = pickViewportSurfaceLatLon(
      {
        canvasWidth: 100,
        canvasHeight: 200,
        pickPositionSupported: true,
        pickPosition: (x, y) => (x === 50 && y === 100 ? centerWorld : undefined),
        getPickRay: () => null,
        globePick: () => undefined,
        pickEllipsoid: () => null,
        cartographicFromCartesian: (cartesian) =>
          cartesian === centerWorld
            ? { latitude: 0.5, longitude: -1.0 }
            : undefined,
        toDegrees: (radians) => radians * (180 / Math.PI),
      },
      50,
      100,
    );

    expect(point).toEqual({
      latitude: (0.5 * 180) / Math.PI,
      longitude: (-1.0 * 180) / Math.PI,
    });
  });

  test("computeViewportBoundsLatLon returns null when a corner is unavailable", () => {
    expect(
      computeViewportBoundsLatLon({
        canvasWidth: 100,
        canvasHeight: 200,
        pickPositionSupported: false,
        pickPosition: () => undefined,
        getPickRay: () => null,
        globePick: () => undefined,
        pickEllipsoid: () => null,
        cartographicFromCartesian: () => undefined,
        toDegrees: (radians) => radians,
      }),
    ).toBeNull();
  });
});
