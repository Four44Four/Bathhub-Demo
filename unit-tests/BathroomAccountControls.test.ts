import {
  bathroomExistenceVoteControlMode,
  bathroomRatingControlMode,
} from "../app/_client/pure/bathroom/BathroomAccountControls";

describe("bathroom account controls", () => {
  test("logged-out or blocked accounts keep the locked indication", () => {
    expect(
      bathroomExistenceVoteControlMode({
        interactionLocked: true,
        voteOnCooldown: true,
      }),
    ).toBe("locked");
    expect(
      bathroomRatingControlMode({
        interactionLocked: true,
        hasRating: true,
      }),
    ).toBe("locked");
  });

  test("a vote on cooldown shows edit, and a stored rating shows edit", () => {
    expect(
      bathroomExistenceVoteControlMode({
        interactionLocked: false,
        voteOnCooldown: true,
      }),
    ).toBe("edit");
    expect(
      bathroomExistenceVoteControlMode({
        interactionLocked: false,
        voteOnCooldown: false,
      }),
    ).toBe("choices");
    expect(
      bathroomRatingControlMode({
        interactionLocked: false,
        hasRating: true,
      }),
    ).toBe("edit");
    expect(
      bathroomRatingControlMode({
        interactionLocked: false,
        hasRating: false,
      }),
    ).toBe("post");
  });
});
