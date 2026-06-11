import { planLocalViewportSyncSchedule } from "../app/_client/pure/bathroom/BathroomLocalSyncDelay";
import { BathroomLocalDB } from "../app/_client/ComponentConstants";

describe("BathroomLocalSyncDelay", () => {
  const delayMs = BathroomLocalDB.QUERY_DELAY_MS;

  test("arms a timer when none is pending", () => {
    expect(planLocalViewportSyncSchedule(false, delayMs)).toEqual({
      kind: "arm",
      delayMs,
    });
  });

  test("skips scheduling while a timer is already pending", () => {
    expect(planLocalViewportSyncSchedule(true, delayMs)).toEqual({
      kind: "skip",
      reason: "timer_pending",
    });
  });
});
