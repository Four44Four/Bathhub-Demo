import {
  bathroomReadByIdValidationError,
  buildReadBathroomByIdRpcParams,
  parseBathroomDataPrimaryFullRow,
  readBathroomById,
  READ_BATHROOM_INVALID_ID_MESSAGE,
  type ReadBathroomByIdRpc,
} from "../app/_server/pure/bathroom-data-primary/ReadBathroomById";

const validRow = {
  id: 7,
  latitude: 37.7,
  longitude: -122.4,
  verify_status: "verified" as const,
  temp_data: "a".repeat(64),
  created_at: "2026-01-01T00:00:00.000Z",
  version: 2,
  rating_1_count: 1,
  rating_2_count: 2,
  rating_3_count: 3,
  rating_4_count: 4,
  rating_5_count: 5,
};

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
    expect(parseBathroomDataPrimaryFullRow(validRow)).toEqual(validRow);
  });

  test("rejects invalid payloads", () => {
    expect(parseBathroomDataPrimaryFullRow(null)).toBeNull();
    expect(parseBathroomDataPrimaryFullRow({ id: 1 })).toBeNull();
  });

  test("builds the RPC parameter object", () => {
    expect(buildReadBathroomByIdRpcParams(7)).toEqual({ p_id: 7 });
  });

  test("rejects an invalid id before calling the RPC", async () => {
    const rpc = jest.fn<
      ReturnType<ReadBathroomByIdRpc>,
      Parameters<ReadBathroomByIdRpc>
    >();

    await expect(readBathroomById(0, rpc)).rejects.toThrow(
      "Failed to read bathroom_data_primary row by id: invalid bathroom id",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  test("returns null when the RPC has no matching row", async () => {
    const rpc = jest
      .fn<ReturnType<ReadBathroomByIdRpc>, Parameters<ReadBathroomByIdRpc>>()
      .mockResolvedValue({ data: null, error: null });

    await expect(readBathroomById(7, rpc)).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith({ p_id: 7 });
  });

  test("returns a valid row from the RPC", async () => {
    const rpc = jest
      .fn<ReturnType<ReadBathroomByIdRpc>, Parameters<ReadBathroomByIdRpc>>()
      .mockResolvedValue({ data: validRow, error: null });

    await expect(readBathroomById(7, rpc)).resolves.toEqual(validRow);
  });

  test("reports RPC and invalid-payload errors with context", async () => {
    const rpcError = jest
      .fn<ReturnType<ReadBathroomByIdRpc>, Parameters<ReadBathroomByIdRpc>>()
      .mockResolvedValue({ data: null, error: { message: "database offline" } });
    await expect(readBathroomById(7, rpcError)).rejects.toThrow(
      "Failed to read bathroom_data_primary row by id: database offline",
    );

    const invalidPayload = jest
      .fn<ReturnType<ReadBathroomByIdRpc>, Parameters<ReadBathroomByIdRpc>>()
      .mockResolvedValue({
        data: { id: 7 } as typeof validRow,
        error: null,
      });
    await expect(readBathroomById(7, invalidPayload)).rejects.toThrow(
      "Failed to read bathroom_data_primary row by id: invalid bathroom row payload",
    );
  });
});
