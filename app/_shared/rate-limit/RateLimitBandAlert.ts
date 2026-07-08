export const RATE_LIMIT_EXCEEDED_MESSAGE_PREFIX = "Rate limit exceeded:";

/** User-facing server task names for rate-limit band alerts (see server_rate_limits.md). */
export const RATE_LIMIT_BAND_TASK_NAMES = {
  "bathroom-create": "bathroom creation",
  "bathroom-read-sync": "retrieving bathrooms",
  "bathroom-find-nearest": "finding nearest bathroom",
  "bathroom-update": "updating bathrooms",
  "ors-path": "path data generation",
  "user-settings-default-db": "pulling current default DB",
  "user-settings-migration": "pulling migration scripts",
} as const;

export type RateLimitBandScope = keyof typeof RATE_LIMIT_BAND_TASK_NAMES;

/** Server `formatRateLimitScopeLabel` values mapped to band-alert task names. */
const RATE_LIMIT_SCOPE_LABEL_TO_BAND_TASK: Readonly<Record<string, string>> = {
  "bathroom creation": RATE_LIMIT_BAND_TASK_NAMES["bathroom-create"],
  "bathroom reading and viewport sync":
    RATE_LIMIT_BAND_TASK_NAMES["bathroom-read-sync"],
  "nearest bathroom lookup":
    RATE_LIMIT_BAND_TASK_NAMES["bathroom-find-nearest"],
  "bathroom updates": RATE_LIMIT_BAND_TASK_NAMES["bathroom-update"],
  "route path generation": RATE_LIMIT_BAND_TASK_NAMES["ors-path"],
  "default user settings database download":
    RATE_LIMIT_BAND_TASK_NAMES["user-settings-default-db"],
  "user settings migration scripts":
    RATE_LIMIT_BAND_TASK_NAMES["user-settings-migration"],
};

export function formatRateLimitViolationBandMessage(
  scope: RateLimitBandScope,
): string {
  return `Violated rate limit for ${RATE_LIMIT_BAND_TASK_NAMES[scope]}`;
}

export function isRateLimitExceededMessage(
  errorMsg: string | undefined,
): errorMsg is string {
  return (
    typeof errorMsg === "string" &&
    errorMsg.startsWith(RATE_LIMIT_EXCEEDED_MESSAGE_PREFIX)
  );
}

/**
 * Resolves the negative band-alert text for a server rate-limit error message.
 * Returns null when `errorMsg` is not a recognized rate-limit violation payload.
 */
export function resolveRateLimitViolationBandMessage(
  errorMsg: string | undefined,
): string | null {
  if (!isRateLimitExceededMessage(errorMsg)) {
    return null;
  }

  const remainder = errorMsg
    .slice(RATE_LIMIT_EXCEEDED_MESSAGE_PREFIX.length)
    .trimStart();
  const scopeLabelEnd = remainder.indexOf(" is limited to ");
  if (scopeLabelEnd === -1) {
    return null;
  }

  const scopeLabel = remainder.slice(0, scopeLabelEnd);
  const taskName = RATE_LIMIT_SCOPE_LABEL_TO_BAND_TASK[scopeLabel];
  if (taskName == null) {
    return null;
  }

  return `Violated rate limit for ${taskName}`;
}
