import {
  ACCOUNT_PASSWORD_MIN_LENGTH,
  ACCOUNT_REPUTATION_INITIAL,
  ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW,
  accountCanVoteOrRate,
  accountEmailFromUsername,
  accountPasswordValidationError,
  accountUsernameValidationError,
  bathroomInteractionLockMessage,
  existenceDeltaForVoteReplacement,
  existenceVoteIsOnCooldown,
  existenceVoteWeight,
  LOGGED_OUT_BATHROOM_INTERACTION_MESSAGE,
  normalizeAccountUsername,
  ratingBucketDelta,
  reputationAfterWeeklyDrift,
  reputationBarBlendT,
  reputationDeltaForActionIndex,
  reputationDeltaForUniqueBathroom,
  REPUTATION_TOO_LOW_BATHROOM_INTERACTION_MESSAGE,
} from "../app/_shared/accounts/AccountReputation";

describe("account reputation rules", () => {
  test("new accounts start at 0 and can vote until reputation drops below -20", () => {
    expect(ACCOUNT_REPUTATION_INITIAL).toBe(0);
    expect(accountCanVoteOrRate(0)).toBe(true);
    expect(accountCanVoteOrRate(ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW)).toBe(
      true,
    );
    expect(accountCanVoteOrRate(ACCOUNT_REPUTATION_VOTE_RATE_BLOCK_BELOW - 1)).toBe(
      false,
    );
  });

  test("reputation increases for the first 5 actions, holds through 10, then decreases", () => {
    expect([1, 2, 3, 4, 5].map(reputationDeltaForActionIndex)).toEqual([
      1, 1, 1, 1, 1,
    ]);
    expect([6, 7, 8, 9, 10].map(reputationDeltaForActionIndex)).toEqual([
      0, 0, 0, 0, 0,
    ]);
    expect([11, 12].map(reputationDeltaForActionIndex)).toEqual([-1, -1]);
  });

  test("a bathroom already in the window does not change reputation", () => {
    expect(reputationDeltaForUniqueBathroom(true, 6)).toBe(0);
    expect(reputationDeltaForUniqueBathroom(false, 6)).toBe(0);
    expect(reputationDeltaForUniqueBathroom(false, 11)).toBe(-1);
  });

  test("existence vote weight gains 1 percent per 10 reputation and loses 10 percent per 5 below 0", () => {
    expect(existenceVoteWeight(0)).toBe(1);
    expect(existenceVoteWeight(9)).toBe(1);
    expect(existenceVoteWeight(10)).toBeCloseTo(1.01);
    expect(existenceVoteWeight(20)).toBeCloseTo(1.02);
    expect(existenceVoteWeight(-1)).toBe(1);
    expect(existenceVoteWeight(-4)).toBe(1);
    expect(existenceVoteWeight(-5)).toBeCloseTo(0.9);
    expect(existenceVoteWeight(-20)).toBeCloseTo(0.6);
    expect(existenceVoteWeight(-25)).toBeCloseTo(0.5);
  });

  test("replacing or undoing a vote applies only the difference in signed weight", () => {
    expect(
      existenceDeltaForVoteReplacement(null, { voteForExists: true, weight: 1 }),
    ).toBe(1);
    expect(
      existenceDeltaForVoteReplacement(
        { voteForExists: true, weight: 1 },
        { voteForExists: false, weight: 0.6 },
      ),
    ).toBeCloseTo(-1.6);
    expect(
      existenceDeltaForVoteReplacement(
        { voteForExists: false, weight: 0.6 },
        null,
      ),
    ).toBeCloseTo(0.6);
  });

  test("a rating change moves one count between star buckets", () => {
    expect(ratingBucketDelta(null, 5, 5)).toBe(1);
    expect(ratingBucketDelta(null, 5, 1)).toBe(0);
    expect(ratingBucketDelta(5, 2, 5)).toBe(-1);
    expect(ratingBucketDelta(5, 2, 2)).toBe(1);
    expect(ratingBucketDelta(2, null, 2)).toBe(-1);
    expect(ratingBucketDelta(4, 4, 4)).toBe(0);
  });

  test("existence vote cooldown lasts one calendar month", () => {
    const votedAt = new Date(Date.UTC(2026, 0, 31, 12, 0, 0));
    expect(
      existenceVoteIsOnCooldown(votedAt, new Date(Date.UTC(2026, 1, 27, 12, 0, 0))),
    ).toBe(true);
    expect(
      existenceVoteIsOnCooldown(votedAt, new Date(Date.UTC(2026, 1, 28, 12, 0, 0))),
    ).toBe(false);
  });

  test("weekly drift moves scores one step toward 0", () => {
    expect(reputationAfterWeeklyDrift(4)).toBe(3);
    expect(reputationAfterWeeklyDrift(-2)).toBe(-1);
    expect(reputationAfterWeeklyDrift(0)).toBe(0);
    expect(reputationAfterWeeklyDrift(1)).toBe(0);
  });

  test("bathroom interaction lock message follows login and reputation", () => {
    expect(bathroomInteractionLockMessage(false, null)).toBe(
      LOGGED_OUT_BATHROOM_INTERACTION_MESSAGE,
    );
    expect(bathroomInteractionLockMessage(true, 0)).toBeNull();
    expect(bathroomInteractionLockMessage(true, -21)).toBe(
      REPUTATION_TOO_LOW_BATHROOM_INTERACTION_MESSAGE,
    );
  });

  test("reputation bar blend clamps to the displayed -20 to 20 range", () => {
    expect(reputationBarBlendT(-20)).toBe(0);
    expect(reputationBarBlendT(20)).toBe(1);
    expect(reputationBarBlendT(0)).toBe(0.5);
    expect(reputationBarBlendT(-40)).toBe(0);
    expect(reputationBarBlendT(40)).toBe(1);
  });

  test("usernames normalize and passwords meet the minimum length", () => {
    expect(normalizeAccountUsername("  Ada_User ")).toBe("ada_user");
    expect(accountEmailFromUsername("Ada_User")).toBe(
      "ada_user@accounts.bathhub.local",
    );
    expect(accountUsernameValidationError("ab")).not.toBeNull();
    expect(accountUsernameValidationError("ada_user")).toBeNull();
    expect(accountPasswordValidationError("short")).not.toBeNull();
    expect(
      accountPasswordValidationError("x".repeat(ACCOUNT_PASSWORD_MIN_LENGTH)),
    ).toBeNull();
  });
});
