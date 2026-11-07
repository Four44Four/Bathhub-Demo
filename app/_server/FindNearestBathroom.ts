"use server";

import { type LatLong } from "../_shared/BathroomDataPrimary";
import { type Errorable } from "../_shared/Utils";
import {
  type FindNearestBathroomConstraints,
  type NearestBathroomClientPayload,
} from "./pure/bathroom-data-primary/FindNearestBathroom";
import { bathroomDbFindNearest } from "./database/bathroom-data-primary/Crud";

export type FindNearestBathroomResult = NearestBathroomClientPayload;

export async function findNearestBathroom(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
  accessToken?: string | null,
): Promise<Errorable<FindNearestBathroomResult | null>> {
  try {
    const nearest =
      accessToken != null && accessToken.length > 0
        ? await bathroomDbFindNearest(location, constraints, accessToken)
        : await bathroomDbFindNearest(location, constraints);
    return { val: nearest };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg:
        error instanceof Error
          ? error.message
          : `Error occurred while finding nearest bathroom: ${String(error)}`,
    };
  }
}
