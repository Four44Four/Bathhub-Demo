/** Existence value at or below which a bathroom enters pending deletion. */
export const BATHROOM_EXISTENCE_VALUE_DELETION_START_THRESHOLD = -10.0 as const;

/** Days after pending deletion starts before a bathroom is permanently deleted. */
export const BATHROOM_DELETION_TIME_AFTER_DELETION_START_DAYS = 180 as const;
