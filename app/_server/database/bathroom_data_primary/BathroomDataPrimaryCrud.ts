"use server";

import {
  type BathroomDataPrimaryRow,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import * as Core from "./BathroomDataPrimaryCrudCore";

export async function bathroomDbCreate(
  latitude: number,
  longitude: number,
): Promise<BathroomDataPrimaryRow> {
  return Core.createBathroomDataPrimaryAt(latitude, longitude);
}

export async function bathroomDbReadInBounds(
  bounds: ViewportBounds,
): Promise<BathroomDataPrimaryRow[]> {
  return Core.getBathroomDataPrimaryInBounds(bounds);
}
