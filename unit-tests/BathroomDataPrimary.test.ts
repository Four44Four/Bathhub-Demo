import {
  bathroomDataPrimaryRowToViewportEntry,
  bathroomSyncUpsertToViewportEntry,
  deletionWaitStartedFlagFromTimestamp,
  deriveVerifyStatusFromBathroomFields,
  deriveVerifyStatusFromExistenceValue,
  isBathroomPendingDeletionFromFlag,
} from "../app/_shared/BathroomDataPrimary";

describe("BathroomDataPrimary shared helpers", () => {
  test("deriveVerifyStatusFromExistenceValue marks verified when existence_value is positive", () => {
    expect(deriveVerifyStatusFromExistenceValue(2)).toBe("verified");
    expect(deriveVerifyStatusFromExistenceValue(0)).toBe("pending");
    expect(deriveVerifyStatusFromExistenceValue(-1)).toBe("pending");
  });

  test("deletionWaitStartedFlagFromTimestamp maps timestamps to 0/1", () => {
    expect(deletionWaitStartedFlagFromTimestamp(null)).toBe(0);
    expect(deletionWaitStartedFlagFromTimestamp("2026-01-01T00:00:00.000Z")).toBe(
      1,
    );
  });

  test("isBathroomPendingDeletionFromFlag treats only 1 as pending deletion", () => {
    expect(isBathroomPendingDeletionFromFlag(0)).toBe(false);
    expect(isBathroomPendingDeletionFromFlag(1)).toBe(true);
    expect(isBathroomPendingDeletionFromFlag(null)).toBe(false);
  });

  test("deriveVerifyStatusFromBathroomFields marks pending deletion first", () => {
    expect(
      deriveVerifyStatusFromBathroomFields(-5, "2026-01-01T00:00:00.000Z"),
    ).toBe("pending-deletion");
    expect(deriveVerifyStatusFromBathroomFields(2, null)).toBe("verified");
    expect(deriveVerifyStatusFromBathroomFields(-1, null)).toBe("pending");
  });

  test("bathroomSyncUpsertToViewportEntry derives verify_status from existence_value", () => {
    expect(
      bathroomSyncUpsertToViewportEntry({
        id: 1,
        latitude: 0,
        longitude: 0,
        existence_value: 2,
        deletion_wait_started_timestamp: null,
        version: 1,
      }),
    ).toEqual({
      id: 1,
      latitude: 0,
      longitude: 0,
      existence_value: 2,
      deletion_wait_started_timestamp: null,
      version: 1,
      verify_status: "verified",
    });
  });

  test("bathroomSyncUpsertToViewportEntry marks pending-deletion when timestamp is set", () => {
    expect(
      bathroomSyncUpsertToViewportEntry({
        id: 1,
        latitude: 0,
        longitude: 0,
        existence_value: 2,
        deletion_wait_started_timestamp: "2026-01-01T00:00:00.000Z",
        version: 1,
      }).verify_status,
    ).toBe("pending-deletion");
  });

  test("bathroomDataPrimaryRowToViewportEntry maps row fields to viewport entry", () => {
    expect(
      bathroomDataPrimaryRowToViewportEntry({
        id: 9,
        latitude: 47.6,
        longitude: -122.3,
        existence_value: 1,
        deletion_wait_started_timestamp: null,
        version: 4,
      }),
    ).toEqual({
      id: 9,
      latitude: 47.6,
      longitude: -122.3,
      existence_value: 1,
      deletion_wait_started_timestamp: null,
      version: 4,
      verify_status: "verified",
    });
  });
});
