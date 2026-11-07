import {
  bathroomCommentInputVisible,
  bathroomExistenceVoteControlMode,
  bathroomOwnCommentText,
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

  test("the comment box stays hidden until the user is composing or editing", () => {
    expect(bathroomCommentInputVisible("edit")).toBe(false);
    expect(bathroomCommentInputVisible("locked")).toBe(false);
    expect(bathroomCommentInputVisible("post")).toBe(true);
  });

  test("reads this account's stored comment text", () => {
    expect(
      bathroomOwnCommentText(
        [
          { accountId: "a", content: "first" },
          { accountId: "b", content: "second" },
        ],
        "b",
      ),
    ).toBe("second");
    expect(bathroomOwnCommentText([{ accountId: "a", content: "first" }], null)).toBe(
      "",
    );
  });
});
