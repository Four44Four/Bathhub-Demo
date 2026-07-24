import {
  bathroomReadByIdValidationError,
  parseBathroomDataPrimaryFullRow,
  READ_BATHROOM_INVALID_ID_MESSAGE,
} from "../app/_server/pure/bathroom-data-primary/ReadBathroomById";

describe("ReadBathroomById", () => {
  test("rejects non-positive ids", () => {
    expect(bathroomReadByIdValidationError(0)).toBe(
      READ_BATHROOM_INVALID_ID_MESSAGE,
    );
    expect(bathroomReadByIdValidationError(-1)).toBe(
      READ_BATHROOM_INVALID_ID_MESSAGE,
    );
  });

  test("accepts positive integer ids", () => {
    expect(bathroomReadByIdValidationError(1)).toBeNull();
  });

  test("parses a full bathroom row", () => {
    expect(
      parseBathroomDataPrimaryFullRow({
        id: 7,
        latitude: 37.7,
        longitude: -122.4,
        verify_status: "verified",
        temp_data: "a".repeat(64),
        created_at: "2026-01-01T00:00:00.000Z",
        version: 2,
        rating_1_count: 1,
        rating_2_count: 2,
        rating_3_count: 3,
        rating_4_count: 4,
        rating_5_count: 5,
      }),
    ).toEqual({
      id: 7,
      latitude: 37.7,
      longitude: -122.4,
      verify_status: "verified",
      temp_data: "a".repeat(64),
      created_at: "2026-01-01T00:00:00.000Z",
      version: 2,
      rating_1_count: 1,
      rating_2_count: 2,
      rating_3_count: 3,
      rating_4_count: 4,
      rating_5_count: 5,
    });
  });

  test("rejects invalid payloads", () => {
    expect(parseBathroomDataPrimaryFullRow(null)).toBeNull();
    expect(parseBathroomDataPrimaryFullRow({ id: 1 })).toBeNull();
  });
});
