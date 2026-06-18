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

    test("pathSurfaceClearanceMeters: base at ground level, scales with camera height", () => {
      expect(PathGeom.pathSurfaceClearanceMeters(0, 10, 2e-5)).toBe(10);
      expect(PathGeom.pathSurfaceClearanceMeters(1_500_000, 10, 2e-5)).toBeCloseTo(40, 5);
      expect(PathGeom.pathSurfaceClearanceMeters(8_000_000, 10, 2e-5)).toBeCloseTo(170, 5);
    });

    test("pathLodSeparationIndices keeps endpoints and enforces pixel gap", () => {
      const projected = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 20, y: 0 },
        { x: 40, y: 0 },
      ];
      expect(PathGeom.pathLodSeparationIndices(projected, 10)).toEqual([0, 2, 3]);
    });

    test("douglasPeuckerScreenIndices preserves corners", () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 20 },
      ];
      const idx = PathGeom.douglasPeuckerScreenIndices(pts, 2);
      expect(idx).toEqual([0, 1, 2, 3]);
    });

    test("decimatePolylineScreenSpace caps vertex count", () => {
      const pts = Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: 0 }));
      const idx = PathGeom.decimatePolylineScreenSpace(pts, 8, 3);
      expect(idx.length).toBeLessThanOrEqual(8);
      expect(idx[0]).toBe(0);
      expect(idx[idx.length - 1]).toBe(19);
    });

    test("pathWorldSamplesSignature is stable for identical samples", () => {
      const samples = [
        { x: 1.23456, y: 2.34567, z: 3.45678 },
        { x: 4.56789, y: 5.67891, z: 6.78912 },
      ];
      const a = PathGeom.pathWorldSamplesSignature(samples);
      const b = PathGeom.pathWorldSamplesSignature(samples);
      expect(a).toBe(b);
    });

    test("pathGeodesicGranularityRadians is coarser at street zoom", () => {
      expect(PathGeom.pathGeodesicGranularityRadians(1_000)).toBeGreaterThan(
        PathGeom.pathGeodesicGranularityRadians(100_000),
      );
    });
});