import {
  bathroomDataPrimaryRowToViewportEntry,
  bathroomSyncUpsertToViewportEntry,
  deriveVerifyStatusFromExistenceValue,
} from "../app/_shared/BathroomDataPrimary";

describe("BathroomDataPrimary shared helpers", () => {
  test("deriveVerifyStatusFromExistenceValue marks verified when existence_value is positive", () => {
    expect(deriveVerifyStatusFromExistenceValue(2)).toBe("verified");
    expect(deriveVerifyStatusFromExistenceValue(0)).toBe("pending");
    expect(deriveVerifyStatusFromExistenceValue(-1)).toBe("pending");
  });

  test("bathroomSyncUpsertToViewportEntry derives verify_status from existence_value", () => {
    expect(
      bathroomSyncUpsertToViewportEntry({
        id: 1,
        latitude: 0,
        longitude: 0,
        existence_value: 2,
        version: 1,
      }),
    ).toEqual({
      id: 1,
      latitude: 0,
      longitude: 0,
      existence_value: 2,
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
        existence_value: 1,
        version: 4,
      }),
    ).toEqual({
      id: 9,
      latitude: 47.6,
      longitude: -122.3,
      existence_value: 1,
      version: 4,
      verify_status: "verified",
    });
  });
});
