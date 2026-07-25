import { formatSupabaseError } from "../formatSupabaseError";
import {
  BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS,
  BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD,
} from "./BathroomDeletionWait";

/** pg_cron schedule for the daily pending-deletion purge (00:00 UTC). */
export const DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_CRON_SCHEDULE_UTC =
  "0 0 * * *" as const;

export const DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_RPC_NAME =
  "delete_expired_pending_deletion_bathrooms" as const;

export const DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_ERROR_CONTEXT =
  "Failed to delete expired pending-deletion bathrooms" as const;

export type DeleteExpiredPendingDeletionBathroomsRpcResult = {
  data: number | null;
  error: { message: string } | null;
};

export type DeleteExpiredPendingDeletionBathroomsRpc =
  () => Promise<DeleteExpiredPendingDeletionBathroomsRpcResult>;

export {
  BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS,
  BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD,
};

export function parseDeleteExpiredPendingDeletionBathroomsRpcResult(
  data: unknown,
): number | null {
  if (typeof data !== "number" || !Number.isFinite(data)) {
    return null;
  }
  return data;
}

export async function deleteExpiredPendingDeletionBathrooms(
  rpc: DeleteExpiredPendingDeletionBathroomsRpc,
): Promise<number> {
  const { data, error } = await rpc();

  if (error !== null) {
    throw new Error(
      formatSupabaseError(
        DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_ERROR_CONTEXT,
        error.message,
      ),
    );
  }

  const parsed = parseDeleteExpiredPendingDeletionBathroomsRpcResult(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        DELETE_EXPIRED_PENDING_DELETION_BATHROOMS_ERROR_CONTEXT,
        "invalid delete expired bathrooms result payload",
      ),
    );
  }

  return parsed;
}
