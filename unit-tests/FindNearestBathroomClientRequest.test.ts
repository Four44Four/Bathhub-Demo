import { requestFindNearestBathroom } from "../app/_client/pure/viewport2d/FindNearestBathroomClientRequest";
import { FIND_NEAREST_BATHROOM_API_PATH } from "../app/_shared/find-nearest-bathroom/FindNearestBathroomApi";

describe("requestFindNearestBathroom", () => {
  const body = {
    location: { latitude: 40.7, longitude: -74 },
    constraints: { maxDistanceM: 5_000, minRating: 0 },
  };

  function mockFetch(response: Response) {
    return jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(response);
  }

  test("posts JSON and returns a successful API payload", async () => {
    const payload = {
      val: { id: 9, latitude: 40.71, longitude: -74.01 },
    };
    const fetchFn = mockFetch(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const controller = new AbortController();

    await expect(
      requestFindNearestBathroom(body, controller.signal, fetchFn),
    ).resolves.toEqual(payload);
    expect(fetchFn).toHaveBeenCalledWith(FIND_NEAREST_BATHROOM_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  });

  test("returns the server rate-limit message for HTTP 429", async () => {
    const fetchFn = mockFetch(
      new Response("Rate limit exceeded: nearest bathroom lookup", {
        status: 429,
      }),
    );

    await expect(
      requestFindNearestBathroom(
        body,
        new AbortController().signal,
        fetchFn,
      ),
    ).resolves.toEqual({
      val: null,
      errorMsg: "Rate limit exceeded: nearest bathroom lookup",
    });
  });

  test("throws a status-specific error for other non-success responses", async () => {
    const fetchFn = mockFetch(new Response(null, { status: 503 }));

    await expect(
      requestFindNearestBathroom(
        body,
        new AbortController().signal,
        fetchFn,
      ),
    ).rejects.toThrow(
      "Find nearest bathroom request failed with status 503",
    );
  });
});
