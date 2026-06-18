import { isGlobeViewportPointerIdle } from "../app/_client/pure/globe/GlobeViewportPointerIdle";

describe("isGlobeViewportPointerIdle", () => {
  test("not idle while a pointer is down", () => {
    expect(
      isGlobeViewportPointerIdle({
        pointersDownCount: 1,
        msSinceLastPointerInput: 10_000,
        idleThresholdMs: 500,
      }),
    ).toBe(false);
  });

  test("not idle until the threshold elapses after the last input", () => {
    expect(
      isGlobeViewportPointerIdle({
        pointersDownCount: 0,
        msSinceLastPointerInput: 499,
        idleThresholdMs: 500,
      }),
    ).toBe(false);
    expect(
      isGlobeViewportPointerIdle({
        pointersDownCount: 0,
        msSinceLastPointerInput: 500,
        idleThresholdMs: 500,
      }),
    ).toBe(true);
  });
});
