const GPKG_MAGIC_G = 0x47;
const GPKG_MAGIC_P = 0x50;
const GPKG_STANDARD_BINARY_FLAG = 0x01;
const WGS84_SRID = 4326;
const WKB_POINT_TYPE = 1;

/** Encodes a WGS84 point as a GeoPackage geometry BLOB. */
export function encodeGpkgPointWgs84(
  longitude: number,
  latitude: number,
): Uint8Array {
  const bytes = new Uint8Array(8 + 1 + 4 + 8 + 8);
  const view = new DataView(bytes.buffer);
  bytes[0] = GPKG_MAGIC_G;
  bytes[1] = GPKG_MAGIC_P;
  bytes[2] = 0;
  bytes[3] = GPKG_STANDARD_BINARY_FLAG;
  view.setUint32(4, WGS84_SRID, true);

  let offset = 8;
  view.setUint8(offset, 1);
  offset += 1;
  view.setUint32(offset, WKB_POINT_TYPE, true);
  offset += 4;
  view.setFloat64(offset, longitude, true);
  offset += 8;
  view.setFloat64(offset, latitude, true);
  return bytes;
}

/** Decodes a GeoPackage geometry BLOB containing a WGS84 point. */
export function decodeGpkgPointWgs84(
  blob: Uint8Array,
): { longitude: number; latitude: number } {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  let offset = 8;
  offset += 1;
  offset += 4;
  const longitude = view.getFloat64(offset, true);
  offset += 8;
  const latitude = view.getFloat64(offset, true);
  return { longitude, latitude };
}
