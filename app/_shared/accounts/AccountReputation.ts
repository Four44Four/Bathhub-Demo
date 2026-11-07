/** Account reputation rules from specifications/accounts/accounts.md. */

export const ACCOUNT_REPUTATION_INITIAL = 0;
export const ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW = -20;
export const ACCOUNT_REPUTATION_INCREASE_THROUGH_ACTION_INDEX = 5;
export const ACCOUNT_REPUTATION_HOLD_THROUGH_ACTION_INDEX = 10;
export const ACCOUNT_REPUTATION_ACTION_WINDOW_SECONDS = 120;
export const ACCOUNT_REPUTATION_WEIGHT_STEP = 10;
export const ACCOUNT_REPUTATION_WEIGHT_BOOST_PER_STEP = 0.01;
export const ACCOUNT_REPUTATION_NEGATIVE_WEIGHT_STEP = 5;
export const ACCOUNT_REPUTATION_NEGATIVE_WEIGHT_DRAG_PER_STEP = 0.1;
export const ACCOUNT_REPUTATION_WEEKLY_DRIFT_STEP = 1;
export const ACCOUNT_EXISTENCE_VOTE_COOLDOWN_MONTHS = 1;

export const ACCOUNT_REQUIRED_ERROR = "account required" as const;
export const REPUTATION_TOO_LOW_ERROR =
  "reputation too low to vote or rate" as const;

export const LOGGED_OUT_BATHROOM_INTERACTION_MESSAGE =
  "Log in to vote or rate bathrooms" as const;
export const REPUTATION_TOO_LOW_BATHROOM_INTERACTION_MESSAGE =
  "Reputation is too low to vote or rate bathrooms" as const;
export const LOGGED_OUT_MARK_BATHROOM_MESSAGE =
  "Log in to mark a bathroom" as const;

export const ACCOUNT_USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;
export const ACCOUNT_EMAIL_DOMAIN = "accounts.bathhub.local" as const;
export const ACCOUNT_PASSWORD_MIN_LENGTH = 6;

export type AccountProfile = {
  accountId: string;
  username: string;
  reputationScore: number;
  accessToken: string;
  /** Data URL of the stored profile picture, or null when the default icon is used. */
  profilePictureDataUrl: string | null;
};

/**
 * Reputation change for a vote or rating whose 1-based unique-bathroom index
 * in the current 2-minute window is `uniqueBathroomIndexInWindow`.
 * Indexes 1-5 add 1, 6-10 add 0, and each later unique bathroom subtracts 1.
 */
export function reputationDeltaForActionIndex(
  uniqueBathroomIndexInWindow: number,
): number {
  if (
    uniqueBathroomIndexInWindow <=
    ACCOUNT_REPUTATION_INCREASE_THROUGH_ACTION_INDEX
  ) {
    return 1;
  }
  if (
    uniqueBathroomIndexInWindow <= ACCOUNT_REPUTATION_HOLD_THROUGH_ACTION_INDEX
  ) {
    return 0;
  }
  return -1;
}

/**
 * Reputation change for one vote or rating.
 * A bathroom already counted in the 2-minute window adds nothing.
 */
export function reputationDeltaForUniqueBathroom(
  alreadyCountedInWindow: boolean,
  uniqueCountAfterAction: number,
): number {
  if (alreadyCountedInWindow) {
    return 0;
  }
  return reputationDeltaForActionIndex(uniqueCountAfterAction);
}

/**
 * Existence-vote weight.
 * Non-negative scores gain 1% per 10 reputation.
 * Negative scores lose 10% per 5 reputation below 0.
 */
export function existenceVoteWeight(reputationScore: number): number {
  if (reputationScore >= 0) {
    const steps = Math.floor(reputationScore / ACCOUNT_REPUTATION_WEIGHT_STEP);
    return 1 + steps * ACCOUNT_REPUTATION_WEIGHT_BOOST_PER_STEP;
  }
  const steps = Math.floor(
    -reputationScore / ACCOUNT_REPUTATION_NEGATIVE_WEIGHT_STEP,
  );
  return 1 - steps * ACCOUNT_REPUTATION_NEGATIVE_WEIGHT_DRAG_PER_STEP;
}

export type StoredExistenceVote = {
  voteForExists: boolean;
  weight: number;
};

/** Signed existence delta. A vote for adds the weight and a vote against subtracts it. */
export function signedExistenceVoteWeight(
  voteForExists: boolean,
  weight: number,
): number {
  return voteForExists ? weight : -weight;
}

/**
 * Existence change when an account's one stored vote is created, replaced, or removed.
 * Passing null for either side means that side has no stored vote.
 */
export function existenceDeltaForVoteReplacement(
  previous: StoredExistenceVote | null,
  next: StoredExistenceVote | null,
): number {
  const previousSigned =
    previous === null
      ? 0
      : signedExistenceVoteWeight(previous.voteForExists, previous.weight);
  const nextSigned =
    next === null
      ? 0
      : signedExistenceVoteWeight(next.voteForExists, next.weight);
  return nextSigned - previousSigned;
}

/** How one star bucket changes when a stored rating is created, replaced, or removed. */
export function ratingBucketDelta(
  previousStars: number | null,
  nextStars: number | null,
  bucket: number,
): number {
  const removed = previousStars === bucket ? 1 : 0;
  const added = nextStars === bucket ? 1 : 0;
  return added - removed;
}

/** UTC calendar-month addition. Day-of-month clamps the way PostgreSQL `interval '1 month'` does. */
export function addCalendarMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** True while `now` is still before one calendar month after the vote. */
export function existenceVoteIsOnCooldown(votedAt: Date, now: Date): boolean {
  const cooldownEndsAt = addCalendarMonthsUtc(
    votedAt,
    ACCOUNT_EXISTENCE_VOTE_COOLDOWN_MONTHS,
  );
  return now.getTime() < cooldownEndsAt.getTime();
}

/** Voting and rating are blocked strictly below -20. */
export function accountCanVoteOrRate(reputationScore: number): boolean {
  return reputationScore >= ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW;
}

/** Weekly drift moves every non-zero score one step toward 0. */
export function reputationAfterWeeklyDrift(reputationScore: number): number {
  if (reputationScore > 0) {
    return reputationScore - ACCOUNT_REPUTATION_WEEKLY_DRIFT_STEP;
  }
  if (reputationScore < 0) {
    return reputationScore + ACCOUNT_REPUTATION_WEEKLY_DRIFT_STEP;
  }
  return 0;
}

/**
 * Message shown on the bathroom page when this session cannot vote or rate.
 * Logged-out users are blocked even before a reputation score is known.
 */
export function bathroomInteractionLockMessage(
  hasAccount: boolean,
  reputationScore: number | null,
): string | null {
  if (!hasAccount) {
    return LOGGED_OUT_BATHROOM_INTERACTION_MESSAGE;
  }
  if (
    reputationScore !== null &&
    !accountCanVoteOrRate(reputationScore)
  ) {
    return REPUTATION_TOO_LOW_BATHROOM_INTERACTION_MESSAGE;
  }
  return null;
}

export function normalizeAccountUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function accountUsernameValidationError(raw: string): string | null {
  const username = normalizeAccountUsername(raw);
  if (!ACCOUNT_USERNAME_PATTERN.test(username)) {
    return "Username must be 3-32 characters of letters, numbers, or underscores";
  }
  return null;
}

export function accountPasswordValidationError(password: string): string | null {
  if (password.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    return "Password must be at least 6 characters";
  }
  return null;
}

export function accountEmailFromUsername(username: string): string {
  return `${normalizeAccountUsername(username)}@${ACCOUNT_EMAIL_DOMAIN}`;
}

/** 0 at the low bar bound and 1 at the high bar bound. Scores outside clamp. */
export function reputationBarBlendT(
  reputationScore: number,
  lowBound = ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW,
  highBound = -ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW,
): number {
  if (highBound === lowBound) {
    return 0;
  }
  const clamped = Math.min(highBound, Math.max(lowBound, reputationScore));
  return (clamped - lowBound) / (highBound - lowBound);
}
