import { publicAccountProfileFromRow } from "../app/_shared/accounts/PublicAccountProfile";

describe("publicAccountProfileFromRow", () => {
  test("reads a public account row with an optional profile picture", () => {
    expect(
      publicAccountProfileFromRow({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        username: "franklin",
        reputation_score: 3,
        profile_picture_mime: "image/png",
        profile_picture_base64: "abc",
      }),
    ).toEqual({
      accountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      username: "franklin",
      reputationScore: 3,
      profilePictureDataUrl: "data:image/png;base64,abc",
    });
    expect(
      publicAccountProfileFromRow({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        username: "franklin",
        reputation_score: 0,
        profile_picture_mime: null,
        profile_picture_base64: null,
      }),
    ).toEqual({
      accountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      username: "franklin",
      reputationScore: 0,
      profilePictureDataUrl: null,
    });
  });
});
