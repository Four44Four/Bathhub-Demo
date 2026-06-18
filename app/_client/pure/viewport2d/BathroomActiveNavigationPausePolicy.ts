import type { PersistedBathroomActiveNavigation } from "@/app/_shared/find-nearest-bathroom/BathroomActiveNavigationPersistence";
import { isClientGeolocationAccessible } from "../globe/ClientGeolocationAccess";
import type { ClientGeoState } from "../../globe/ClientGeoContext";

/** Spec: pause active navigation when geolocation is unavailable. */
export function shouldPauseBathroomActiveNavigation(
  activeNavigation: PersistedBathroomActiveNavigation | null,
  clientGeo: ClientGeoState,
): boolean {
  if (!activeNavigation) return false;
  return !isClientGeolocationAccessible(clientGeo);
}

/** Spec: resume when geo becomes accessible again while navigation is still active. */
export function shouldResumeBathroomActiveNavigation(
  activeNavigation: PersistedBathroomActiveNavigation | null,
  isPaused: boolean,
  clientGeo: ClientGeoState,
): boolean {
  if (!activeNavigation || !isPaused) return false;
  return isClientGeolocationAccessible(clientGeo);
}
