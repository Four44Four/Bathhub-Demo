"use server";

import {
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryFullRow,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type LatLong,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import { unwrapRateLimitExceededMessage } from "../../../_shared/rate-limit/RateLimitBandAlert";
import { type Errorable } from "../../../_shared/Utils";
import { type OwnBathroomInteraction } from "../../pure/bathroom-data-primary/OwnBathroomInteraction";
import {
  type BathroomComment,
  type ClearBathroomRatingChange,
} from "../../pure/bathroom-data-primary/BathroomComments";
import {
  type FindNearestBathroomConstraints,
  type NearestBathroomClientPayload,
  toNearestBathroomClientPayload,
} from "../../pure/bathroom-data-primary/FindNearestBathroom";
import { ACCOUNT_REQUIRED_ERROR } from "../../../_shared/accounts/AccountReputation";
import { accountIdFromAccessToken } from "../../pure/accounts/AccountAccessToken";
import {
  tryEnforceServerRateLimit,
  type RateLimitEnforcementResult,
} from "../../rate-limit/enforceRateLimit";
import { type RateLimitScope } from "../../pure/rate-limit/RateLimit";
import * as Core from "./CrudCore";

async function enforceActorRateLimit(
  scope: RateLimitScope,
  accessToken?: string | null,
): Promise<RateLimitEnforcementResult> {
  const accountId = accountIdFromAccessToken(accessToken);
  if (accountId !== null) {
    return tryEnforceServerRateLimit(scope, accountId);
  }
  return tryEnforceServerRateLimit(scope);
}

function missingAccountResult<T>(): { val: null; errorMsg: string } {
  return { val: null, errorMsg: ACCOUNT_REQUIRED_ERROR };
}

function mutationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return unwrapRateLimitExceededMessage(message) ?? message;
}

export async function bathroomDbCreate(
  latitude: number,
  longitude: number,
  accessToken?: string | null,
): Promise<Errorable<BathroomDataPrimaryRow>> {
  const rateLimit = await enforceActorRateLimit("bathroom-create", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  if (accessToken == null || accessToken.length === 0) {
    return missingAccountResult();
  }

  try {
    return { val: await Core.createAt(latitude, longitude, accessToken) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbIncrementRating(
  id: number,
  stars: number,
  accessToken?: string | null,
  comment?: string | null,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await enforceActorRateLimit("bathroom-update", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  if (accessToken == null || accessToken.length === 0) {
    return missingAccountResult();
  }

  try {
    return {
      val: await Core.incrementRatingCount(id, stars, accessToken, comment),
    };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbIncrementExistenceVote(
  id: number,
  voteForExists: boolean,
  accessToken?: string | null,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await enforceActorRateLimit("bathroom-update", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  if (accessToken == null || accessToken.length === 0) {
    return missingAccountResult();
  }

  try {
    return {
      val: await Core.incrementExistenceVoteCount(
        id,
        voteForExists ? "exists" : "not_exists",
        accessToken,
      ),
    };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbReadOwnInteraction(
  id: number,
  accessToken?: string | null,
): Promise<Errorable<OwnBathroomInteraction>> {
  const rateLimit = await enforceActorRateLimit("bathroom-read-by-id", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  if (accessToken == null || accessToken.length === 0) {
    return missingAccountResult();
  }

  try {
    return {
      val: await Core.readOwnBathroomInteractionForAccount(id, accessToken),
    };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbClearExistenceVote(
  id: number,
  accessToken?: string | null,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await enforceActorRateLimit("bathroom-update", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  if (accessToken == null || accessToken.length === 0) {
    return missingAccountResult();
  }

  try {
    return { val: await Core.clearExistenceVote(id, accessToken) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbClearRating(
  id: number,
  accessToken?: string | null,
  change?: ClearBathroomRatingChange | null,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await enforceActorRateLimit("bathroom-update", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }
  if (accessToken == null || accessToken.length === 0) {
    return missingAccountResult();
  }

  try {
    return { val: await Core.clearRating(id, accessToken, change) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbListComments(
  id: number,
  accessToken?: string | null,
): Promise<Errorable<BathroomComment[]>> {
  const rateLimit = await enforceActorRateLimit("bathroom-read-by-id", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    return { val: await Core.listComments(id, accessToken) };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbReadInBounds(
  bounds: ViewportBounds,
  accessToken?: string | null,
): Promise<BathroomDataPrimaryRow[]> {
  const rateLimit = await enforceActorRateLimit("bathroom-read-sync", accessToken);
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message);
  }

  return Core.getInBounds(bounds);
}

export async function bathroomDbReadById(
  id: number,
  accessToken?: string | null,
): Promise<Errorable<BathroomDataPrimaryFullRow>> {
  const rateLimit = await enforceActorRateLimit("bathroom-read-by-id", accessToken);
  if (!rateLimit.allowed) {
    return { val: null, errorMsg: rateLimit.message };
  }

  try {
    const row = await Core.getById(id);
    if (row === null) {
      return { val: null, errorMsg: "bathroom not found" };
    }
    return { val: row };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: mutationErrorMessage(error),
    };
  }
}

export async function bathroomDbSyncInBounds(
  bounds: ViewportBounds,
  clientCache: BathroomClientCacheEntry[],
  accessToken?: string | null,
): Promise<BathroomSyncResponse> {
  const rateLimit = await enforceActorRateLimit(
    "bathroom-read-sync",
    accessToken,
  );
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message);
  }

  return Core.syncInBounds(bounds, clientCache);
}

export async function bathroomDbFindNearest(
  location: LatLong,
  constraints: FindNearestBathroomConstraints,
  accessToken?: string | null,
): Promise<NearestBathroomClientPayload | null> {
  const rateLimit = await enforceActorRateLimit(
    "bathroom-find-nearest",
    accessToken,
  );
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.message);
  }

  const row = await Core.findNearest(location, constraints);
  if (!row) return null;
  return toNearestBathroomClientPayload(row);
}
