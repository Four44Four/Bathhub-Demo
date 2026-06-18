jest.mock("../app/_server/database/bathroom-data-primary/Crud", () => ({
  bathroomDbFindNearest: jest.fn(),
}));

import { findNearestBathroom } from "../app/_server/FindNearestBathroom";
import { bathroomDbFindNearest } from "../app/_server/database/bathroom-data-primary/Crud";

const mockBathroomDbFindNearest = bathroomDbFindNearest as jest.MockedFunction<
  typeof bathroomDbFindNearest
>;

describe("findNearestBathroom server action", () => {
  beforeEach(() => {
    mockBathroomDbFindNearest.mockReset();
  });

  test("passes location and constraints through to the database layer", async () => {
    const location = { latitude: 40.7128, longitude: -74.006 };
    const constraints = { maxDistanceM: 5000 };
    const bathroom = { id: 7, latitude: 40.7135, longitude: -74.0065 };
    mockBathroomDbFindNearest.mockResolvedValue(bathroom);

    const result = await findNearestBathroom(location, constraints);

    expect(mockBathroomDbFindNearest).toHaveBeenCalledWith(location, constraints);
    expect(result).toEqual({ val: bathroom });
    expect(result.errorMsg).toBeUndefined();
  });

  test("returns null without errorMsg when no bathroom is found", async () => {
    mockBathroomDbFindNearest.mockResolvedValue(null);

    const result = await findNearestBathroom(
      { latitude: -80, longitude: 0 },
      { maxDistanceM: 100 },
    );

    expect(result).toEqual({ val: null });
    expect(result.errorMsg).toBeUndefined();
  });

  test("returns errorMsg when the database layer throws an Error", async () => {
    mockBathroomDbFindNearest.mockRejectedValue(new Error("rpc failed"));

    const result = await findNearestBathroom(
      { latitude: 1, longitude: 2 },
      { maxDistanceM: 100 },
    );

    expect(result).toEqual({ val: null, errorMsg: "rpc failed" });
  });

  test("returns errorMsg when the database layer throws a non-Error value", async () => {
    mockBathroomDbFindNearest.mockRejectedValue("boom");

    const result = await findNearestBathroom(
      { latitude: 1, longitude: 2 },
      { maxDistanceM: 100 },
    );

    expect(result).toEqual({
      val: null,
      errorMsg: "Error occurred while finding nearest bathroom: boom",
    });
  });
});
