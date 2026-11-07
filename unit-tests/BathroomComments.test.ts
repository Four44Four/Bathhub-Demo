import { bathroomDeleteRatingConfirmationMessage, normalizeBathroomCommentContent } from "../app/_shared/bathroom/BathroomCommentContent";
import {
  commentInputFontHeightPx,
  commentInputHeightPx,
  commentInputScrollTopPx,
} from "../app/_client/pure/bathroom/CommentInputLayout";
import {
  buildClearBathroomRatingRpcParams,
  parseBathroomCommentList,
  withOwnBathroomComment,
  type BathroomComment,
} from "../app/_server/pure/bathroom-data-primary/BathroomComments";

describe("bathroom comment content", () => {
  test("stores trimmed text and treats a blank field as no comment", () => {
    expect(normalizeBathroomCommentContent("  open late  ")).toBe("open late");
    expect(normalizeBathroomCommentContent("   ")).toBeNull();
    expect(normalizeBathroomCommentContent("")).toBeNull();
  });

  test("asks about the comment only when one is stored", () => {
    expect(bathroomDeleteRatingConfirmationMessage(true)).toBe(
      "Delete your rating and comment?",
    );
    expect(bathroomDeleteRatingConfirmationMessage(false)).toBe(
      "Delete your rating?",
    );
  });
});

describe("comment input layout", () => {
  test("grows from twice the font height to five times, then scrolls", () => {
    const fontHeightPx = commentInputFontHeightPx(14, 1.2);
    expect(fontHeightPx).toBeCloseTo(16.8);

    expect(
      commentInputHeightPx({
        contentScrollHeightPx: 10,
        fontHeightPx,
        minMultiplier: 2,
        maxMultiplier: 5,
      }),
    ).toEqual({ heightPx: fontHeightPx * 2, scrollable: false });

    expect(
      commentInputHeightPx({
        contentScrollHeightPx: fontHeightPx * 3,
        fontHeightPx,
        minMultiplier: 2,
        maxMultiplier: 5,
      }),
    ).toEqual({ heightPx: fontHeightPx * 3, scrollable: false });

    expect(
      commentInputHeightPx({
        contentScrollHeightPx: fontHeightPx * 8,
        fontHeightPx,
        minMultiplier: 2,
        maxMultiplier: 5,
      }),
    ).toEqual({ heightPx: fontHeightPx * 5, scrollable: true });
  });

  test("scrolls the caret into view", () => {
    expect(
      commentInputScrollTopPx({
        caretTopPx: 20,
        clientHeightPx: 40,
        scrollTopPx: 30,
      }),
    ).toBe(20);
    expect(
      commentInputScrollTopPx({
        caretTopPx: 90,
        clientHeightPx: 40,
        scrollTopPx: 10,
      }),
    ).toBe(50);
    expect(
      commentInputScrollTopPx({
        caretTopPx: 25,
        clientHeightPx: 40,
        scrollTopPx: 10,
      }),
    ).toBe(10);
  });
});

describe("bathroom comment records", () => {
  const comments: BathroomComment[] = [
    {
      accountId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      content: "second",
      ratingStars: 2,
      profilePictureDataUrl: null,
    },
    {
      accountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      content: "first",
      ratingStars: 5,
      profilePictureDataUrl: "data:image/png;base64,abc",
    },
  ];

  test("parses comment rows and rejects a bad payload", () => {
    expect(
      parseBathroomCommentList([
        {
          account_id: "account-1",
          content: "  hello ",
          rating_stars: 4,
          profile_picture_mime: "image/png",
          profile_picture_base64: "abc",
        },
        { account_id: "account-2", content: "plain", rating_stars: null },
      ]),
    ).toEqual([
      {
        accountId: "account-1",
        content: "hello",
        ratingStars: 4,
        profilePictureDataUrl: "data:image/png;base64,abc",
      },
      {
        accountId: "account-2",
        content: "plain",
        ratingStars: null,
        profilePictureDataUrl: null,
      },
    ]);
    expect(parseBathroomCommentList([])).toEqual([]);
    expect(parseBathroomCommentList({ account_id: "account-1" })).toBeNull();
    expect(
      parseBathroomCommentList([
        { account_id: "account-1", content: "   ", rating_stars: 1 },
      ]),
    ).toBeNull();
  });

  test("replaces only this account's comment and keeps its picture", () => {
    expect(
      withOwnBathroomComment(
        comments,
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "edited",
        null,
      ),
    ).toEqual([
      {
        accountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        content: "edited",
        ratingStars: null,
        profilePictureDataUrl: "data:image/png;base64,abc",
      },
      comments[0],
    ]);
    expect(
      withOwnBathroomComment(
        comments,
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        null,
        null,
      ),
    ).toEqual([comments[0]]);
  });

  test("clear params overwrite a comment or delete it", () => {
    expect(buildClearBathroomRatingRpcParams(7)).toEqual({ p_id: 7 });
    expect(
      buildClearBathroomRatingRpcParams(7, {
        comment: "note",
        deleteComment: false,
      }),
    ).toEqual({ p_id: 7, p_comment: "note" });
    expect(
      buildClearBathroomRatingRpcParams(7, {
        comment: null,
        deleteComment: false,
      }),
    ).toEqual({ p_id: 7 });
    expect(
      buildClearBathroomRatingRpcParams(7, {
        comment: "note",
        deleteComment: true,
      }),
    ).toEqual({ p_id: 7, p_delete_comment: true });
  });
});
