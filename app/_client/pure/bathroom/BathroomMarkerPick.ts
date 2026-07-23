export const BATHROOM_MARKER_ENTITY_NAME_PREFIX = "BathroomMarker-";

/** Parses a bathroom id from a Cesium entity `name` (e.g. `BathroomMarker-42`). */
export function bathroomMarkerIdFromEntityName(name: string | undefined): number | null {
  if (name == null || !name.startsWith(BATHROOM_MARKER_ENTITY_NAME_PREFIX)) {
    return null;
  }
  const id = Number.parseInt(name.slice(BATHROOM_MARKER_ENTITY_NAME_PREFIX.length), 10);
  return Number.isFinite(id) ? id : null;
}

function bathroomMarkerIdFromEntityLike(entity: unknown): number | null {
  if (entity == null || typeof entity !== "object") {
    return null;
  }
  return bathroomMarkerIdFromEntityName((entity as { name?: string }).name);
}

/**
 * Resolves a bathroom id from a Cesium `scene.pick` / `scene.drillPick` result.
 * Entity billboards are usually exposed through `picked.id` or `picked.primitive.id`.
 */
export function bathroomMarkerIdFromPick(picked: unknown): number | null {
  if (picked == null || typeof picked !== "object") {
    return null;
  }

  const pickObject = picked as {
    name?: string;
    id?: unknown;
    primitive?: { id?: unknown };
  };

  const fromDirectName = bathroomMarkerIdFromEntityName(pickObject.name);
  if (fromDirectName != null) {
    return fromDirectName;
  }

  const fromId = bathroomMarkerIdFromEntityLike(pickObject.id);
  if (fromId != null) {
    return fromId;
  }

  return bathroomMarkerIdFromEntityLike(pickObject.primitive?.id);
}

/** Returns the first bathroom marker id found in drill-pick results (front to back). */
export function bathroomMarkerIdFromDrillPick(pickedObjects: readonly unknown[]): number | null {
  for (const picked of pickedObjects) {
    const bathroomId = bathroomMarkerIdFromPick(picked);
    if (bathroomId != null) {
      return bathroomId;
    }
  }
  return null;
}
