import {
  buildCreateBathroomRpcParams,
  CREATE_BATHROOM_ERROR_CONTEXT,
  createBathroomAt,
  generateTempData,
  isAlphanumericString,
  randomAlphanumericString,
  TEMP_DATA_LENGTH,
} from "../app/_server/pure/bathroom-data-primary/CreateBathroom";
import { formatSupabaseError } from "../app/_server/pure/formatSupabaseError";
import { type BathroomDataPrimaryRow } from "../app/_shared/BathroomDataPrimary";

const sampleRow: BathroomDataPrimaryRow = {
  id: 42,
  latitude: 45.5,
  longitude: -73.6,
  verify_status: "pending",
  temp_data: "abc123",
  created_at: "2026-06-09T00:00:00.000Z",
  version: 0,
};

describe("CreateBathroom pure logic", () => {
  test("formatSupabaseError joins context and message", () => {
    expect(formatSupabaseError("Failed to read row", "connection refused")).toBe(
      "Failed to read row: connection refused",
    );
  });

  test("randomAlphanumericString respects length and charset", () => {
    const value = randomAlphanumericString(12, () => 0);
    expect(value).toHaveLength(12);
    expect(value).toBe("a".repeat(12));
    expect(isAlphanumericString(value)).toBe(true);
  });

  test("randomAlphanumericString cycles through charset with injected picker", () => {
    let call = 0;
    const value = randomAlphanumericString(4, (max) => call++ % max);
    expect(value).toBe("abcd");
  });

  test("generateTempData returns a 64 character alphanumeric string", () => {
    const value = generateTempData(() => 0);
    expect(value).toHaveLength(TEMP_DATA_LENGTH);
    expect(isAlphanumericString(value)).toBe(true);
  });

  test("buildCreateBathroomRpcParams maps lat, long, and temp_data", () => {
    expect(buildCreateBathroomRpcParams(10, -20, "temp")).toEqual({
      p_latitude: 10,
      p_longitude: -20,
      p_temp_data: "temp",
    });
  });
});

describe("createBathroomAt", () => {
  test("returns the RPC row on success", async () => {
    const row = await createBathroomAt(
      45.5,
      -73.6,
      async () => ({ data: sampleRow, error: null }),
      () => "fixed-temp-data",
    );

    expect(row).toEqual(sampleRow);
  });

  test("passes lat, long, and generated temp_data to the RPC", async () => {
    let receivedParams:
      | {
          p_latitude: number;
          p_longitude: number;
          p_temp_data: string;
        }
      | undefined;

    await createBathroomAt(
      12.34,
      56.78,
      async (params) => {
        receivedParams = params;
        return { data: sampleRow, error: null };
      },
      () => "test-temp-data",
    );

    expect(receivedParams).toEqual({
      p_latitude: 12.34,
      p_longitude: 56.78,
      p_temp_data: "test-temp-data",
    });
  });

  test("throws a formatted error when the RPC fails", async () => {
    await expect(
      createBathroomAt(
        0,
        0,
        async () => ({ data: null, error: { message: "duplicate key" } }),
        () => "temp",
      ),
    ).rejects.toThrow(
      `${CREATE_BATHROOM_ERROR_CONTEXT}: duplicate key`,
    );
  });
});
