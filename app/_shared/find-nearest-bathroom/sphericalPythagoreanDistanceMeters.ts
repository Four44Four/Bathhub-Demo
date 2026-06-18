import { type LatLong } from "../BathroomDataPrimary";

const WGS84_MEAN_EARTH_RADIUS_M = 6_371_000;

/** Spherical Pythagorean distance on the WGS84 mean Earth sphere (meters). */
export function sphericalPythagoreanDistanceMeters(a: LatLong, b: LatLong): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const avgLat = (lat1 + lat2) / 2;

  const northM = dLat * WGS84_MEAN_EARTH_RADIUS_M;
  const eastM = dLon * WGS84_MEAN_EARTH_RADIUS_M * Math.cos(avgLat);

  return Math.hypot(northM, eastM);
}
