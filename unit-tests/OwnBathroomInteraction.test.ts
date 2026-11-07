import { parseOwnBathroomInteraction } from "../app/_server/pure/bathroom-data-primary/OwnBathroomInteraction";

describe("parseOwnBathroomInteraction", () => {
  test("reads a cooldown vote and a stored rating", () => {
    expect(
      parseOwnBathroomInteraction({
        vote_for_exists: true,
        vote_on_cooldown: true,
        rating_stars: 4,
      }),
    ).toEqual({
      voteForExists: true,
      voteOnCooldown: true,
      ratingStars: 4,
    });
  });

  test("reads an account with no vote or rating", () => {
    expect(
      parseOwnBathroomInteraction({
        vote_for_exists: null,
        vote_on_cooldown: false,
        rating_stars: null,
      }),
    ).toEqual({
      voteForExists: null,
      voteOnCooldown: false,
      ratingStars: null,
    });
  });
});
