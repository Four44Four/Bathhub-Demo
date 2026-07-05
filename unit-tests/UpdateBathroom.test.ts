import {
  UPDATE_BATHROOM_ERROR_CONTEXT,
  UPDATE_BATHROOM_INVALID_ID_MESSAGE,
  UPDATE_BATHROOM_INVALID_VERIFY_STATUS_MESSAGE,
  bathroomUpdateValidationError,
  buildUpdateBathroomVerifyStatusRpcParams,
  updateBathroomVerifyStatus,
} from "../app/_server/pure/bathroom-data-primary/UpdateBathroom";
import { type BathroomDataPrimaryRow } from "../app/_shared/BathroomDataPrimary";

const sampleRow: BathroomDataPrimaryRow = {
  id: 42,
  latitude: 45.5,
  longitude: -73.6,
  verify_status: "verified",
  temp_data: "a".repeat(64),
  created_at: "2026-06-09T00:00:00.000Z",
  version: 1,
};

describe("UpdateBathroom pure logic", () => {
  test("bathroomUpdateValidationError rejects invalid ids and statuses", () => {
    expect(bathroomUpdateValidationError(0, "verified")).toBe(
      UPDATE_BATHROOM_INVALID_ID_MESSAGE,
    );
    expect(bathroomUpdateValidationError(1.5, "verified")).toBe(
      UPDATE_BATHROOM_INVALID_ID_MESSAGE,
    );
    expect(
      bathroomUpdateValidationError(
        1,
        "invalid" as Parameters<typeof bathroomUpdateValidationError>[1],
      ),
    ).toBe(UPDATE_BATHROOM_INVALID_VERIFY_STATUS_MESSAGE);
    expect(bathroomUpdateValidationError(1, "verified")).toBeNull();
  });

  test("buildUpdateBathroomVerifyStatusRpcParams maps id and verify_status", () => {
    expect(buildUpdateBathroomVerifyStatusRpcParams(42, "verified")).toEqual({
      p_id: 42,
      p_verify_status: "verified",
    });
  });
});

describe("updateBathroomVerifyStatus", () => {
  test("returns the RPC row on success", async () => {
    await expect(
      updateBathroomVerifyStatus(42, "verified", async () => ({
        data: sampleRow,
        error: null,
      })),
    ).resolves.toEqual(sampleRow);
  });

  test("passes validated update params to the RPC", async () => {
    let receivedParams:
      | {
          p_id: number;
          p_verify_status: "pending" | "verified";
        }
      | undefined;

    await updateBathroomVerifyStatus(7, "pending", async (params) => {
      receivedParams = params;
      return { data: sampleRow, error: null };
    });

    expect(receivedParams).toEqual({
      p_id: 7,
      p_verify_status: "pending",
    });
  });

  test("throws a formatted validation error before calling RPC", async () => {
    const rpc = jest.fn();

    await expect(
      updateBathroomVerifyStatus(0, "verified", rpc),
    ).rejects.toThrow(
      `${UPDATE_BATHROOM_ERROR_CONTEXT}: ${UPDATE_BATHROOM_INVALID_ID_MESSAGE}`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  test("throws a formatted error when the RPC fails", async () => {
    await expect(
      updateBathroomVerifyStatus(42, "verified", async () => ({
        data: null,
        error: { message: "row not found" },
      })),
    ).rejects.toThrow(`${UPDATE_BATHROOM_ERROR_CONTEXT}: row not found`);
  });
});
