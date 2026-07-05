import {
  orderBandAlertsNewestFirst,
  resolveBandAlertAutoHideDelayMs,
} from "../app/_client/pure/viewport2d/BandAlertPolicy";

describe("BandAlertPolicy", () => {
  test("resolveBandAlertAutoHideDelayMs returns default duration unless persisted", () => {
    expect(resolveBandAlertAutoHideDelayMs(false, 3_000)).toBe(3_000);
    expect(resolveBandAlertAutoHideDelayMs(true, 3_000)).toBeNull();
  });

  test("orderBandAlertsNewestFirst places the most recent alert first", () => {
    const ordered = orderBandAlertsNewestFirst([
      { id: "old", createdAtMs: 1 },
      { id: "new", createdAtMs: 3 },
      { id: "mid", createdAtMs: 2 },
    ]);

    expect(ordered.map((entry) => entry.id)).toEqual(["new", "mid", "old"]);
  });
});
