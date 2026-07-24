import {
  INCREMENT_BATHROOM_INVALID_ID_MESSAGE,
  INCREMENT_BATHROOM_INVALID_STARS_MESSAGE,
  INCREMENT_BATHROOM_RATING_ERROR_CONTEXT,
  buildIncrementBathroomRatingRpcParams,
  incrementBathroomRating,
  incrementBathroomRatingValidationError,
} from "../app/_server/pure/bathroom-data-primary/IncrementBathroomRating";
import { type BathroomDataPrimaryFullRow } from "../app/_shared/BathroomDataPrimary";

const sampleRow: BathroomDataPrimaryFullRow = {
  id: 42,
  latitude: 45.5,
  longitude: -73.6,
  verify_status: "verified",
  temp_data: "a".repeat(64),
  created_at: "2026-06-09T00:00:00.000Z",
  version: 2,
  rating_1_count: 0,
  rating_2_count: 0,
  rating_3_count: 0,
  rating_4_count: 1,
  rating_5_count: 0,
};

describe("IncrementBathroomRating pure logic", () => {
  test("incrementBathroomRatingValidationError rejects invalid ids and stars", () => {
    expect(incrementBathroomRatingValidationError(0, 3)).toBe(
      INCREMENT_BATHROOM_INVALID_ID_MESSAGE,
    );
    expect(incrementBathroomRatingValidationError(1.5, 3)).toBe(
      INCREMENT_BATHROOM_INVALID_ID_MESSAGE,
    );
    expect(incrementBathroomRatingValidationError(1, 0)).toBe(
      INCREMENT_BATHROOM_INVALID_STARS_MESSAGE,
    );
    expect(incrementBathroomRatingValidationError(1, 6)).toBe(
      INCREMENT_BATHROOM_INVALID_STARS_MESSAGE,
    );
    expect(incrementBathroomRatingValidationError(1, 3)).toBeNull();
  });

  test("buildIncrementBathroomRatingRpcParams maps id and stars", () => {
    expect(buildIncrementBathroomRatingRpcParams(42, 4)).toEqual({
      p_id: 42,
      p_stars: 4,
    });
  });
});

describe("incrementBathroomRating", () => {
  test("returns the RPC row on success", async () => {
    await expect(
      incrementBathroomRating(42, 4, async () => ({
        data: sampleRow,
        error: null,
      })),
    ).resolves.toEqual(sampleRow);
  });

  test("passes validated increment params to the RPC", async () => {
    let receivedParams:
      | {
          p_id: number;
          p_stars: number;
        }
      | undefined;

    await incrementBathroomRating(7, 5, async (params) => {
      receivedParams = params;
      return { data: sampleRow, error: null };
    });

    expect(receivedParams).toEqual({
      p_id: 7,
      p_stars: 5,
    });
  });

  test("throws a formatted validation error before calling RPC", async () => {
    const rpc = jest.fn();

    await expect(incrementBathroomRating(0, 3, rpc)).rejects.toThrow(
      `${INCREMENT_BATHROOM_RATING_ERROR_CONTEXT}: ${INCREMENT_BATHROOM_INVALID_ID_MESSAGE}`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  test("throws a formatted error when the RPC fails", async () => {
    await expect(
      incrementBathroomRating(42, 3, async () => ({
        data: null,
        error: { message: "row not found" },
      })),
    ).rejects.toThrow(`${INCREMENT_BATHROOM_RATING_ERROR_CONTEXT}: row not found`);
  });
});
