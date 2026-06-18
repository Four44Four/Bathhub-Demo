import type { Point } from "@/app/_shared/Utils";
import type { ClientGeoState } from "../../globe/ClientGeoContext";
import {
  type GlobeViewportHandle,
  getStartPos,
} from "../../globe/GlobeViewport";

/** Resolves the pathfinding start position from a live geo ref snapshot and optional globe handle. */
export function readClientStartPos(
  globe: GlobeViewportHandle | null,
  clientGeo: ClientGeoState,
): Point {
  return getStartPos(
    globe,
    clientGeo.isClientGeoGranted,
    clientGeo.mapInitLat,
    clientGeo.mapInitLong,
  );
}
