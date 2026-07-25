import {
  bathroomDataPrimaryRowToViewportEntry,
  bathroomSyncUpsertToViewportEntry,
  deriveVerifyStatusFromExistenceVotes,
} from "../app/_shared/BathroomDataPrimary";

describe("BathroomDataPrimary shared helpers", () => {
  test("deriveVerifyStatusFromExistenceVotes marks verified when exists votes exceed not-exists", () => {
    expect(deriveVerifyStatusFromExistenceVotes(3, 1)).toBe("verified");
    expect(deriveVerifyStatusFromExistenceVotes(1, 1)).toBe("pending");
    expect(deriveVerifyStatusFromExistenceVotes(0, 0)).toBe("pending");
  });

  test("bathroomSyncUpsertToViewportEntry derives verify_status from vote counts", () => {
    expect(
      bathroomSyncUpsertToViewportEntry({
        id: 1,
        latitude: 0,
        longitude: 0,
        exists_vote_count: 2,
        not_exists_vote_count: 0,
        version: 1,
      }),
    ).toEqual({
      id: 1,
      latitude: 0,
      longitude: 0,
      exists_vote_count: 2,
      not_exists_vote_count: 0,
      version: 1,
      verify_status: "verified",
    });
  });

  test("bathroomDataPrimaryRowToViewportEntry maps row fields to viewport entry", () => {
    expect(
      bathroomDataPrimaryRowToViewportEntry({
        id: 9,
        latitude: 47.6,
        longitude: -122.3,
        exists_vote_count: 2,
        not_exists_vote_count: 1,
        version: 4,
      }),
    ).toEqual({
      id: 9,
      latitude: 47.6,
      longitude: -122.3,
      exists_vote_count: 2,
      not_exists_vote_count: 1,
      version: 4,
      verify_status: "verified",
    });
  });
});
