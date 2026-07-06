import type { ClientGeoState } from "../../globe/ClientGeoContext";

export type GeolocationPermissionState = "granted" | "denied" | "prompt" | "unknown";

/** Whether the client may use live geolocation (permission granted and position available). */
export function isClientGeolocationAccessible(clientGeo: ClientGeoState): boolean {
  return clientGeo.isClientGeoGranted;
}

/** Whether a stored geo fix from session storage may bootstrap the client on load. */
export function shouldApplyStoredGeoFixOnLoad(
  permissionState: GeolocationPermissionState,
): boolean {
  if (permissionState === "granted") return true;
  // Permissions API unavailable — keep prior bootstrap behavior (e.g. Safari).
  if (permissionState === "unknown") return true;
  return false;
}

/** Whether a stored geo fix should be discarded on load. */
export function shouldDiscardStoredGeoFixOnLoad(
  permissionState: GeolocationPermissionState,
): boolean {
  return permissionState === "denied";
}

/** Reads the current geolocation permission state from the Permissions API. */
export async function readGeolocationPermissionState(): Promise<GeolocationPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}
