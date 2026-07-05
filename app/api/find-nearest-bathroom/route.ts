import { NextRequest } from "next/server";

import { findNearestBathroom } from "@/app/_server/FindNearestBathroom";
import { type FindNearestBathroomRequestBody } from "@/app/_shared/find-nearest-bathroom/FindNearestBathroomApi";

export async function POST(request: NextRequest) {
  if (request.signal.aborted) {
    return new Response(null, { status: 499 });
  }

  const body = (await request.json()) as FindNearestBathroomRequestBody;
  const result = await findNearestBathroom(body.location, body.constraints);

  if (request.signal.aborted) {
    return new Response(null, { status: 499 });
  }

  if (result.errorMsg?.startsWith("Rate limit exceeded:")) {
    return new Response(result.errorMsg, { status: 429 });
  }

  return Response.json(result);
}
