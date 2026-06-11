import {
  decodeGpkgPointWgs84,
  encodeGpkgPointWgs84,
} from "../app/_client/pure/bathroom/GeoPackagePointGeometry";

describe("GeoPackagePointGeometry", () => {
  test("encodeGpkgPointWgs84 writes GeoPackage magic and WGS84 SRID", () => {
    const blob = encodeGpkgPointWgs84(2.3522, 48.8566);
    expect(blob[0]).toBe(0x47);
    expect(blob[1]).toBe(0x50);
    expect(blob[3]).toBe(0x01);

    const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
    expect(view.getUint32(4, true)).toBe(4326);
  });

  test("round-trips WGS84 coordinates through encode and decode", () => {
    const longitude = -73.5673;
    const latitude = 45.5017;
    const blob = encodeGpkgPointWgs84(longitude, latitude);
    expect(decodeGpkgPointWgs84(blob)).toEqual({ longitude, latitude });
  });

  test("decodeGpkgPointWgs84 reads coordinates from a known blob layout", () => {
    const blob = encodeGpkgPointWgs84(0, 0);
    expect(decodeGpkgPointWgs84(blob)).toEqual({
      longitude: 0,
      latitude: 0,
    });
  });
});
