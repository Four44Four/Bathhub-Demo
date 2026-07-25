import {
  BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS,
  BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD,
} from "../app/_server/pure/bathroom-data-primary/BathroomDeletionWait";

describe("BathroomDeletionWait constants", () => {
  test("matches the specification", () => {
    expect(BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD).toBe(-10.0);
    expect(BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS).toBe(180);
  });
});
