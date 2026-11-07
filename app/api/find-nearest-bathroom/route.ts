import { NextRequest } from "next/server";

import { accessTokenFromAuthorizationHeader } from "@/app/_server/pure/accounts/AccountAccessToken";
import { findNearestBathroom } from "@/app/_server/FindNearestBathroom";
import { type FindNearestBathroomRequestBody } from "@/app/_shared/find-nearest-bathroom/FindNearestBathroomApi";

export async function POST(request: NextRequest) {
  if (request.signal.aborted) {
    return new Response(null, { status: 499 });
  }

  const body = (await request.json()) as FindNearestBathroomRequestBody;
  const accessToken = accessTokenFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  const result =
    accessToken === null
      ? await findNearestBathroom(body.location, body.constraints)
      : await findNearestBathroom(body.location, body.constraints, accessToken);

  if (request.signal.aborted) {
    return new Response(null, { status: 499 });
  }

  if (result.errorMsg?.startsWith("Rate limit exceeded:")) {
    return new Response(result.errorMsg, { status: 429 });
  }

  return Response.json(result);
}
