import {
  BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS,
  BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD,
  DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_CRON_SCHEDULE_UTC,
  DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_ERROR_CONTEXT,
  DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_RPC_NAME,
  deleteExpiredPendingDeletionBathrooms,
  parseDeleteExpiredPendingDeletionBathroomsRpcResult,
} from "../app/_server/pure/bathroom-data-primary/DeleteExpiredPendingDeletionBathrooms";

describe("DeleteExpiredPendingDeletionBathrooms constants", () => {
  test("matches the specification", () => {
    expect(BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD).toBe(-10.0);
    expect(BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS).toBe(180);
    expect(DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_CRON_SCHEDULE_UTC).toBe(
      "0 0 * * *",
    );
    expect(DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_RPC_NAME).toBe(
      "delete_expired_pending_deletion_bathrooms",
    );
  });
});

describe("parseDeleteExpiredPendingDeletionBathroomsRpcResult", () => {
  test("accepts finite numeric RPC results", () => {
    expect(parseDeleteExpiredPendingDeletionBathroomsRpcResult(3)).toBe(3);
    expect(parseDeleteExpiredPendingDeletionBathroomsRpcResult(0)).toBe(0);
  });

  test("rejects invalid RPC results", () => {
    expect(parseDeleteExpiredPendingDeletionBathroomsRpcResult(null)).toBeNull();
    expect(parseDeleteExpiredPendingDeletionBathroomsRpcResult("3")).toBeNull();
    expect(
      parseDeleteExpiredPendingDeletionBathroomsRpcResult(Number.NaN),
    ).toBeNull();
  });
});

describe("deleteExpiredPendingDeletionBathrooms", () => {
  test("returns the deleted row count from the RPC", async () => {
    await expect(
      deleteExpiredPendingDeletionBathrooms(async () => ({
        data: 2,
        error: null,
      })),
    ).resolves.toBe(2);
  });

  test("throws a formatted error when the RPC fails", async () => {
    await expect(
      deleteExpiredPendingDeletionBathrooms(async () => ({
        data: null,
        error: { message: "permission denied" },
      })),
    ).rejects.toThrow(
      `${DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_ERROR_CONTEXT}: permission denied`,
    );
  });

  test("throws a formatted error for invalid RPC payloads", async () => {
    await expect(
      deleteExpiredPendingDeletionBathrooms(async () => ({
        data: "2" as unknown as number,
        error: null,
      })),
    ).rejects.toThrow(
      `${DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_ERROR_CONTEXT}: invalid delete expired bathrooms result payload`,
    );
  });
});
