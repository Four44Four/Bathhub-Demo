import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type InputCoordinate } from "./formatCrudReport";

export function loadLocations(): InputCoordinate[] {
  const raw = readFileSync(join(__dirname, "locations.json"), "utf8");
  const parsed = JSON.parse(raw) as { bathrooms: InputCoordinate[] };

  if (!Array.isArray(parsed.bathrooms) || parsed.bathrooms.length === 0) {
    throw new Error("locations.json must define a non-empty bathrooms array");
  }

  return parsed.bathrooms;
}
