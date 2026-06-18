import {
  FIND_NEAREST_INVALID_COORDINATES_MESSAGE,
  FIND_NEAREST_INVALID_MAX_DISTANCE_MESSAGE,
  buildFindNearestBathroomRpcParams,
  findNearestBathroomQueryValidationError,
  parseFindNearestBathroomRpcData,
  parseFindNearestBathroomRpcRow,
  toNearestBathroomClientPayload,
} from "../app/_server/pure/bathroom-data-primary/FindNearestBathroom";

describe("FindNearestBathroom", () => {
  test("findNearestBathroomQueryValidationError rejects non-finite coordinates and max distance", () => {
    expect(
      findNearestBathroomQueryValidationError(
        { latitude: Number.NaN, longitude: 0 },
        { maxDistanceM: 100 },
      ),
    ).toBe(FIND_NEAREST_INVALID_COORDINATES_MESSAGE);
    expect(
      findNearestBathroomQueryValidationError(
        { latitude: 0, longitude: Number.POSITIVE_INFINITY },
        { maxDistanceM: 100 },
      ),
    ).toBe(FIND_NEAREST_INVALID_COORDINATES_MESSAGE);
    expect(
      findNearestBathroomQueryValidationError(
        { latitude: 0, longitude: 0 },
        { maxDistanceM: Number.NaN },
      ),
    ).toBe(FIND_NEAREST_INVALID_COORDINATES_MESSAGE);
    expect(
      findNearestBathroomQueryValidationError(
        { latitude: 0, longitude: 0 },
        { maxDistanceM: -1 },
      ),
    ).toBe(FIND_NEAREST_INVALID_MAX_DISTANCE_MESSAGE);
    expect(
      findNearestBathroomQueryValidationError(
        { latitude: 0, longitude: 0 },
        { maxDistanceM: 0 },
      ),
    ).toBeNull();
  });

  test("buildFindNearestBathroomRpcParams maps location and constraints", () => {
    expect(
      buildFindNearestBathroomRpcParams(
        { latitude: 12.3, longitude: 45.6 },
        { maxDistanceM: 5000 },
      ),
    ).toEqual({
      p_latitude: 12.3,
      p_longitude: 45.6,
      p_max_distance_m: 5000,
    });
  });

  test("parseFindNearestBathroomRpcRow validates row shape", () => {
    expect(
      parseFindNearestBathroomRpcRow({
        id: 7,
        latitude: 1,
        longitude: 2,
      }),
    ).toEqual({ id: 7, latitude: 1, longitude: 2 });
    expect(parseFindNearestBathroomRpcRow({ id: "bad" })).toBeNull();
  });

  test("parseFindNearestBathroomRpcData parses first RPC row or null", () => {
    expect(parseFindNearestBathroomRpcData([])).toBeNull();
    expect(parseFindNearestBathroomRpcData(null)).toBeNull();
    expect(
      parseFindNearestBathroomRpcData([
        { id: 1, latitude: 0, longitude: 0 },
      ]),
    ).toEqual({ id: 1, latitude: 0, longitude: 0 });
    expect(parseFindNearestBathroomRpcData([{ id: "bad" }])).toBeNull();
  });

  test("toNearestBathroomClientPayload returns id and location", () => {
    expect(
      toNearestBathroomClientPayload({ id: 9, latitude: 1, longitude: 2 }),
    ).toEqual({ id: 9, latitude: 1, longitude: 2 });
  });
});
