import {
  BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_CRON_SCHEDULE_UTC,
  BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR,
  DECAY_BATHROOM_EXISTENCE_VALUE_ERROR_CONTEXT,
  decayAllBathroomExistenceValues,
  decayBathroomExistenceValue,
  parseDecayBathroomExistenceValueRpcResult,
} from "../app/_server/pure/bathroom-data-primary/DecayBathroomExistenceValue";

describe("DecayBathroomExistenceValue constants", () => {
  test("matches the daily decay specification", () => {
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR).toBe(0.995);
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR).toBe(1 - 0.005);
    expect(BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_CRON_SCHEDULE_UTC).toBe(
      "0 0 * * *",
    );
  });
});

describe("decayBathroomExistenceValue", () => {
  test("multiplies existence_value by the daily decay factor", () => {
    expect(decayBathroomExistenceValue(100)).toBe(99.5);
    expect(decayBathroomExistenceValue(0)).toBe(0);
    expect(decayBathroomExistenceValue(-10)).toBe(-9.95);
  });

  test("decreases magnitude by 0.5 percent for positive and negative values", () => {
    expect(decayBathroomExistenceValue(100)).toBe(100 * (1 - 0.005));
    expect(decayBathroomExistenceValue(-10)).toBe(-10 * (1 - 0.005));
  });
});

describe("parseDecayBathroomExistenceValueRpcResult", () => {
  test("accepts finite numeric RPC results", () => {
    expect(parseDecayBathroomExistenceValueRpcResult(12)).toBe(12);
    expect(parseDecayBathroomExistenceValueRpcResult(0)).toBe(0);
  });

  test("rejects invalid RPC results", () => {
    expect(parseDecayBathroomExistenceValueRpcResult(null)).toBeNull();
    expect(parseDecayBathroomExistenceValueRpcResult("12")).toBeNull();
    expect(parseDecayBathroomExistenceValueRpcResult(Number.NaN)).toBeNull();
  });
});

describe("decayAllBathroomExistenceValues", () => {
  test("returns the updated row count from the RPC", async () => {
    await expect(
      decayAllBathroomExistenceValues(async () => ({
        data: 4,
        error: null,
      })),
    ).resolves.toBe(4);
  });

  test("throws a formatted error when the RPC fails", async () => {
    await expect(
      decayAllBathroomExistenceValues(async () => ({
        data: null,
        error: { message: "permission denied" },
      })),
    ).rejects.toThrow(
      `${DECAY_BATHROOM_EXISTENCE_VALUE_ERROR_CONTEXT}: permission denied`,
    );
  });

  test("throws a formatted error for invalid RPC payloads", async () => {
    await expect(
      decayAllBathroomExistenceValues(async () => ({
        data: "4" as unknown as number,
        error: null,
      })),
    ).rejects.toThrow(
      `${DECAY_BATHROOM_EXISTENCE_VALUE_ERROR_CONTEXT}: invalid decay result payload`,
    );
  });
});
