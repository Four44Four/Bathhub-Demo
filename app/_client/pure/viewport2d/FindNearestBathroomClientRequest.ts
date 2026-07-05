import {
  FIND_NEAREST_BATHROOM_API_PATH,
  type FindNearestBathroomApiResponse,
  type FindNearestBathroomRequestBody,
} from "@/app/_shared/find-nearest-bathroom/FindNearestBathroomApi";

export async function requestFindNearestBathroom(
  body: FindNearestBathroomRequestBody,
  signal: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<FindNearestBathroomApiResponse> {
  const response = await fetchFn(FIND_NEAREST_BATHROOM_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 429) {
    return { val: null, errorMsg: await response.text() };
  }
  if (!response.ok) {
    throw new Error(
      `Find nearest bathroom request failed with status ${response.status}`,
    );
  }
  return response.json() as Promise<FindNearestBathroomApiResponse>;
}
