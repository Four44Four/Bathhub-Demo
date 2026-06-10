"use client";

import { type Errorable } from "../_shared/Utils";
import { type BathroomDataPrimaryRow } from "../_shared/BathroomDataPrimary";
import * as BathroomCrud from "../_server/database/bathroom_data_primary/BathroomDataPrimaryCrud";

async function toErrorable<T>(run: () => Promise<T>): Promise<Errorable<T>> {
  try {
    return { val: await run() };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createBathroomAt(
  latitude: number,
  longitude: number,
): Promise<Errorable<BathroomDataPrimaryRow>> {
  return toErrorable(() =>
    BathroomCrud.bathroomDbCreate(latitude, longitude),
  );
}
