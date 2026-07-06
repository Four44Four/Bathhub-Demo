/** Default `ClientGeoState` map init before any fix is published. */
export const UNSET_CLIENT_GEO_LAT = 0;
export const UNSET_CLIENT_GEO_LONG = 0;

/** Whether lat/long are still the pre-fix client-geo sentinel (not a confirmed poll). */
export function isUnsetClientGeoPosition(lat: number, long: number): boolean {
  return lat === UNSET_CLIENT_GEO_LAT && long === UNSET_CLIENT_GEO_LONG;
}

export function clientGeoPositionsClose(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  epsilonDeg = 0.002,
): boolean {
  return (
    Math.abs(a.lat - b.lat) < epsilonDeg && Math.abs(a.lng - b.lng) < epsilonDeg
  );
}
