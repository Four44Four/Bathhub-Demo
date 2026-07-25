import { formatSupabaseError } from "../formatSupabaseError";

/** Multiplier applied daily to every bathroom existence_value (0.5% decrease). */
export const BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR = 0.995 as const;

/** pg_cron schedule for the daily decay task (00:00 UTC). */
export const BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_CRON_SCHEDULE_UTC =
  "0 0 * * *" as const;

export const DECAY_BATHROOM_EXISTENCE_VALUE_RPC_NAME =
  "decay_bathroom_data_primary_existence_value" as const;

export const DECAY_BATHROOM_EXISTENCE_VALUE_ERROR_CONTEXT =
  "Failed to decay bathroom_data_primary existence values" as const;

export type DecayBathroomExistenceValueRpcResult = {
  data: number | null;
  error: { message: string } | null;
};

export type DecayBathroomExistenceValueRpc =
  () => Promise<DecayBathroomExistenceValueRpcResult>;

/** Applies one daily decay step to a single existence_value. */
export function decayBathroomExistenceValue(existenceValue: number): number {
  return existenceValue * BATHROOM_EXISTENCE_VALUE_DAILY_DECAY_FACTOR;
}

export function parseDecayBathroomExistenceValueRpcResult(
  data: unknown,
): number | null {
  if (typeof data !== "number" || !Number.isFinite(data)) {
    return null;
  }
  return data;
}

export async function decayAllBathroomExistenceValues(
  rpc: DecayBathroomExistenceValueRpc,
): Promise<number> {
  const { data, error } = await rpc();

  if (error !== null) {
    throw new Error(
      formatSupabaseError(
        DECAY_BATHROOM_EXISTENCE_VALUE_ERROR_CONTEXT,
        error.message,
      ),
    );
  }

  const parsed = parseDecayBathroomExistenceValueRpcResult(data);
  if (parsed === null) {
    throw new Error(
      formatSupabaseError(
        DECAY_BATHROOM_EXISTENCE_VALUE_ERROR_CONTEXT,
        "invalid decay result payload",
      ),
    );
  }

  return parsed;
}
