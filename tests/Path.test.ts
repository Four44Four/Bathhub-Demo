import * as PathGeom from "../app/_client/pure/globe/PathGeometry";

describe("pathGeometryMath", () => {
    test("dedupeConsecutiveLngLat", () => {
      const pts = [
        { latitude: 1, longitude: 2 },
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 4 },
      ];
      expect(PathGeom.dedupeConsecutiveLngLat(pts)).toEqual([
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 4 },
      ]);
    });
  
    test("quadraticBezierVector3 at ends", () => {
      const p0 = { x: 0, y: 0, z: 0 };
      const p1 = { x: 1, y: 0, z: 0 };
      const p2 = { x: 2, y: 0, z: 0 };
      expect(PathGeom.quadraticBezierVector3(p0, p1, p2, 0)).toEqual(p0);
      expect(PathGeom.quadraticBezierVector3(p0, p1, p2, 1)).toEqual(p2);
    });
  
    test("pathEdgeStart01", () => {
      expect(PathGeom.pathEdgeStart01(8, 10.5)).toBeCloseTo(8 / 10.5, 6);
    });
  
    test("resamplePolylineUniformIndices", () => {
      expect(PathGeom.resamplePolylineUniformIndices(3, 5)).toEqual([0, 2, 4]);
    });
});