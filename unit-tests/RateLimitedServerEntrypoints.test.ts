const mockEnforceServerRateLimit = jest.fn();
const mockTryEnforceServerRateLimit = jest.fn();
const mockGetDefaultUserSettingsDbSnapshotBytes = jest.fn();
const mockFindNearestBathroom = jest.fn();
const mockCreateAt = jest.fn();
const mockUpdateVerifyStatus = jest.fn();
const mockIncrementRatingCount = jest.fn();
const mockGetInBounds = jest.fn();
const mockGetById = jest.fn();
const mockSyncInBounds = jest.fn();
const mockFindNearestCore = jest.fn();
const mockFetchRoutePathGeoJson = jest.fn();

jest.mock("../app/_server/rate-limit/enforceRateLimit", () => {
  class RateLimitExceededError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RateLimitExceededError";
    }
  }

  return {
    enforceServerRateLimit: (...args: unknown[]) =>
      mockEnforceServerRateLimit(...args),
    tryEnforceServerRateLimit: (...args: unknown[]) =>
      mockTryEnforceServerRateLimit(...args),
    RateLimitExceededError,
  };
});

jest.mock("../app/_server/user-settings/getDefaultUserSettingsDbSnapshotBytes", () => ({
  getDefaultUserSettingsDbSnapshotBytes: (...args: unknown[]) =>
    mockGetDefaultUserSettingsDbSnapshotBytes(...args),
}));

jest.mock("../app/_server/FindNearestBathroom", () => ({
  findNearestBathroom: (...args: unknown[]) => mockFindNearestBathroom(...args),
}));

jest.mock("../app/_server/database/bathroom-data-primary/CrudCore", () => ({
  createAt: (...args: unknown[]) => mockCreateAt(...args),
  updateVerifyStatus: (...args: unknown[]) => mockUpdateVerifyStatus(...args),
  incrementRatingCount: (...args: unknown[]) => mockIncrementRatingCount(...args),
  getInBounds: (...args: unknown[]) => mockGetInBounds(...args),
  getById: (...args: unknown[]) => mockGetById(...args),
  syncInBounds: (...args: unknown[]) => mockSyncInBounds(...args),
  findNearest: (...args: unknown[]) => mockFindNearestCore(...args),
}));

jest.mock("../app/_server/ors/ORSPathfind", () => ({
  fetchRoutePathGeoJson: (...args: unknown[]) =>
    mockFetchRoutePathGeoJson(...args),
  getPointsGeoJson: () => [],
  getPredictedTimeGeoJson: () => undefined,
  getPredictedDistanceGeoJson: () => undefined,
}));

import { POST as findNearestPost } from "../app/api/find-nearest-bathroom/route";
import { GET as userSettingsDefaultDbGet } from "../app/api/user-settings/default-db/route";
import {
  bathroomDbCreate,
  bathroomDbFindNearest,
  bathroomDbIncrementRating,
  bathroomDbReadById,
  bathroomDbReadInBounds,
  bathroomDbSyncInBounds,
  bathroomDbUpdateVerifyStatus,
} from "../app/_server/database/bathroom-data-primary/Crud";
import { getPathBetweenPoints } from "../app/_server/Pathfind";
import { getUserSettingsSchemaMigration } from "../app/_server/user-settings/UserSettingsSchemaMigration";
import { RateLimitExceededError } from "../app/_server/rate-limit/enforceRateLimit";
import { type ViewportBounds } from "../app/_shared/BathroomDataPrimary";

describe("rate-limited server entrypoints", () => {
  beforeEach(() => {
    mockEnforceServerRateLimit.mockReset();
    mockTryEnforceServerRateLimit.mockReset();
    mockGetDefaultUserSettingsDbSnapshotBytes.mockReset();
    mockFindNearestBathroom.mockReset();
    mockCreateAt.mockReset();
    mockUpdateVerifyStatus.mockReset();
    mockIncrementRatingCount.mockReset();
    mockGetInBounds.mockReset();
    mockGetById.mockReset();
    mockSyncInBounds.mockReset();
    mockFindNearestCore.mockReset();
    mockFetchRoutePathGeoJson.mockReset();
  });

  test("default user settings DB route returns 429 when rate limited", async () => {
    const message =
      "Rate limit exceeded: default user settings database download is limited to 5 requests per minute.";
    mockEnforceServerRateLimit.mockRejectedValue(
      new RateLimitExceededError(message),
    );

    const response = await userSettingsDefaultDbGet();

    expect(mockEnforceServerRateLimit).toHaveBeenCalledWith(
      "user-settings-default-db",
    );
    expect(response.status).toBe(429);
    await expect(response.text()).resolves.toBe(message);
    expect(mockGetDefaultUserSettingsDbSnapshotBytes).not.toHaveBeenCalled();
  });

  test("find-nearest route returns 429 for rate-limit error payloads", async () => {
    const message =
      "Rate limit exceeded: nearest bathroom lookup is limited to 20 requests per minute.";
    mockFindNearestBathroom.mockResolvedValue({ val: null, errorMsg: message });

    const request = new Request("http://localhost/api/find-nearest-bathroom", {
      method: "POST",
      body: JSON.stringify({
        location: { latitude: 1, longitude: 2 },
        constraints: { maxDistanceM: 1000 },
      }),
    });

    const response = await findNearestPost(request as Parameters<typeof findNearestPost>[0]);

    expect(response.status).toBe(429);
    await expect(response.text()).resolves.toBe(message);
  });

  test("user settings migration action returns rate_limited result", async () => {
    const message =
      "Rate limit exceeded: user settings migration scripts is limited to 5 requests per minute.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(getUserSettingsSchemaMigration(0)).resolves.toEqual({
      ok: false,
      error: "rate_limited",
      message,
    });
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith(
      "user-settings-migration",
    );
  });

  test("bathroom create action enforces bathroom-create scope before DB work", async () => {
    const message =
      "Rate limit exceeded: bathroom creation is limited to 5 requests per minute.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(bathroomDbCreate(40.7, -74.0)).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith("bathroom-create");
    expect(mockCreateAt).not.toHaveBeenCalled();
  });

  test("bathroom update action enforces bathroom-update scope before DB work", async () => {
    const message =
      "Rate limit exceeded: bathroom updates is limited to 20 requests per minute.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(bathroomDbUpdateVerifyStatus(1, "verified")).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith("bathroom-update");
    expect(mockUpdateVerifyStatus).not.toHaveBeenCalled();
  });

  test("bathroom increment rating action enforces bathroom-update scope before DB work", async () => {
    const message =
      "Rate limit exceeded: bathroom updates is limited to 20 requests per minute.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(bathroomDbIncrementRating(1, 4)).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith("bathroom-update");
    expect(mockIncrementRatingCount).not.toHaveBeenCalled();
  });

  test("bathroom read action enforces bathroom-read-sync scope before DB work", async () => {
    const message =
      "Rate limit exceeded: bathroom reading and viewport sync is limited to 100 requests per 30 seconds.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });
    const bounds: ViewportBounds = {
      lowerLeft: { latitude: 0, longitude: 0 },
      upperRight: { latitude: 1, longitude: 1 },
    };

    await expect(bathroomDbReadInBounds(bounds)).rejects.toThrow(message);
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith(
      "bathroom-read-sync",
    );
    expect(mockGetInBounds).not.toHaveBeenCalled();
  });

  test("bathroom read-by-id action enforces bathroom-read-by-id scope before DB work", async () => {
    const message =
      "Rate limit exceeded: bathroom reading by id is limited to 100 requests per 30 seconds.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(bathroomDbReadById(1)).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith(
      "bathroom-read-by-id",
    );
    expect(mockGetById).not.toHaveBeenCalled();
  });

  test("bathroom sync action enforces bathroom-read-sync scope before DB work", async () => {
    const message =
      "Rate limit exceeded: bathroom reading and viewport sync is limited to 100 requests per 30 seconds.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });
    const bounds: ViewportBounds = {
      lowerLeft: { latitude: 0, longitude: 0 },
      upperRight: { latitude: 1, longitude: 1 },
    };

    await expect(bathroomDbSyncInBounds(bounds, [])).rejects.toThrow(message);
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith(
      "bathroom-read-sync",
    );
    expect(mockSyncInBounds).not.toHaveBeenCalled();
  });

  test("bathroom nearest action enforces bathroom-find-nearest scope before DB work", async () => {
    const message =
      "Rate limit exceeded: nearest bathroom lookup is limited to 20 requests per minute.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(
      bathroomDbFindNearest(
        { latitude: 1, longitude: 2 },
        { maxDistanceM: 1000 },
      ),
    ).rejects.toThrow(message);
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith(
      "bathroom-find-nearest",
    );
    expect(mockFindNearestCore).not.toHaveBeenCalled();
  });

  test("ORS path action enforces ors-path scope before route fetch", async () => {
    const message =
      "Rate limit exceeded: route path generation is limited to 10 requests per minute.";
    mockTryEnforceServerRateLimit.mockResolvedValue({
      allowed: false,
      message,
    });

    await expect(
      getPathBetweenPoints({
        profile: "foot-walking",
        startLatitude: 1,
        startLongitude: 2,
        endLatitude: 3,
        endLongitude: 4,
      }),
    ).resolves.toEqual({
      val: null,
      errorMsg: message,
    });
    expect(mockTryEnforceServerRateLimit).toHaveBeenCalledWith("ors-path");
    expect(mockFetchRoutePathGeoJson).not.toHaveBeenCalled();
  });
});
