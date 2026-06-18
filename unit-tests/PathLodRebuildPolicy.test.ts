import {
  pathLodOrbitCenterDistancesEqual,
  shouldSchedulePathLodRebuildOnIdle,
} from "../app/_client/pure/globe/PathLodRebuildPolicy";

describe("pathLodOrbitCenterDistancesEqual", () => {
  test("treats identical and near-equal distances as equal", () => {
    expect(pathLodOrbitCenterDistancesEqual(6_372_000, 6_372_000)).toBe(true);
    expect(
      pathLodOrbitCenterDistancesEqual(6_372_000, 6_372_000 + 1e-3),
    ).toBe(true);
  });

  test("treats meaningfully different distances as unequal", () => {
    expect(pathLodOrbitCenterDistancesEqual(6_372_000, 6_373_000)).toBe(
      false,
    );
    expect(pathLodOrbitCenterDistancesEqual(6_500_000, 6_400_000)).toBe(false);
  });
});

describe("shouldSchedulePathLodRebuildOnIdle", () => {
  test("schedules when no prior rebuild distance is recorded", () => {
    expect(
      shouldSchedulePathLodRebuildOnIdle({
        currentOrbitCenterDistanceM: 6_372_500,
        lastRebuiltOrbitCenterDistanceM: null,
      }),
    ).toBe(true);
  });

  test("skips when zoom level is unchanged", () => {
    expect(
      shouldSchedulePathLodRebuildOnIdle({
        currentOrbitCenterDistanceM: 6_372_500,
        lastRebuiltOrbitCenterDistanceM: 6_372_500,
      }),
    ).toBe(false);
  });

  test("schedules when zoom level changed", () => {
    expect(
      shouldSchedulePathLodRebuildOnIdle({
        currentOrbitCenterDistanceM: 6_380_000,
        lastRebuiltOrbitCenterDistanceM: 6_372_500,
      }),
    ).toBe(true);
  });
});
