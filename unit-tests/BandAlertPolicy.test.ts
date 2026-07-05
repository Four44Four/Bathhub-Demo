import {
  appendBandAlertWithMaxStack,
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

  test("appendBandAlertWithMaxStack drops oldest alerts when the stack is exceeded", () => {
    const existing = [
      { id: "a", createdAtMs: 1 },
      { id: "b", createdAtMs: 2 },
      { id: "c", createdAtMs: 3 },
      { id: "d", createdAtMs: 4 },
      { id: "e", createdAtMs: 5 },
    ];

    const next = appendBandAlertWithMaxStack(
      existing,
      { id: "f", createdAtMs: 6 },
      5,
    );

    expect(next.map((entry) => entry.id)).toEqual(["b", "c", "d", "e", "f"]);
  });

  test("appendBandAlertWithMaxStack breaks createdAtMs ties by insertion order", () => {
    const existing = [
      { id: "first", createdAtMs: 1 },
      { id: "second", createdAtMs: 1 },
      { id: "third", createdAtMs: 1 },
      { id: "fourth", createdAtMs: 1 },
      { id: "fifth", createdAtMs: 1 },
    ];

    const next = appendBandAlertWithMaxStack(
      existing,
      { id: "sixth", createdAtMs: 1 },
      5,
    );

    expect(next.map((entry) => entry.id)).toEqual([
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
    ]);
  });
});
