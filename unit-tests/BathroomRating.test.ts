import {
  EMPTY_BATHROOM_RATING_COUNTS,
  bathroomAverageRating,
  bathroomAverageRatingLabel,
  bathroomAverageRatingRounded,
  bathroomIncrementRatingCount,
  bathroomPostRatingStars,
  bathroomRatingBarFillRatio,
  bathroomRatingCountSpacePx,
  bathroomRatingCountsFromFullRow,
  bathroomRatingCountsDescending,
  bathroomTotalRatingCount,
  starRatingFillFraction,
} from "../app/_client/pure/bathroom/BathroomRating";

describe("bathroomTotalRatingCount", () => {
  test("sums all rating columns", () => {
    expect(
      bathroomTotalRatingCount({
        rating_1_count: 1,
        rating_2_count: 2,
        rating_3_count: 3,
        rating_4_count: 4,
        rating_5_count: 5,
      }),
    ).toBe(15);
  });
});

describe("bathroomRatingCountsFromFullRow", () => {
  test("selects only the five rating count columns", () => {
    expect(
      bathroomRatingCountsFromFullRow({
        rating_1_count: 1,
        rating_2_count: 2,
        rating_3_count: 3,
        rating_4_count: 4,
        rating_5_count: 5,
      }),
    ).toEqual({
      rating_1_count: 1,
      rating_2_count: 2,
      rating_3_count: 3,
      rating_4_count: 4,
      rating_5_count: 5,
    });
  });
});

describe("bathroomAverageRating", () => {
  test("returns 0 when there are no ratings", () => {
    expect(bathroomAverageRating(EMPTY_BATHROOM_RATING_COUNTS)).toBe(0);
  });

  test("computes weighted average", () => {
    expect(
      bathroomAverageRating({
        rating_1_count: 0,
        rating_2_count: 0,
        rating_3_count: 0,
        rating_4_count: 0,
        rating_5_count: 18,
      }),
    ).toBe(5);
    expect(
      bathroomAverageRating({
        rating_1_count: 6,
        rating_2_count: 0,
        rating_3_count: 0,
        rating_4_count: 0,
        rating_5_count: 0,
      }),
    ).toBe(1);
    expect(
      bathroomAverageRating({
        rating_1_count: 6,
        rating_2_count: 6,
        rating_3_count: 6,
        rating_4_count: 0,
        rating_5_count: 0,
      }),
    ).toBe(2);
  });
});

describe("bathroomAverageRatingRounded", () => {
  test("rounds to one decimal place", () => {
    expect(
      bathroomAverageRatingRounded({
        rating_1_count: 1,
        rating_2_count: 1,
        rating_3_count: 1,
        rating_4_count: 1,
        rating_5_count: 1,
      }),
    ).toBe(3);
    expect(
      bathroomAverageRatingRounded({
        rating_1_count: 1,
        rating_2_count: 0,
        rating_3_count: 0,
        rating_4_count: 0,
        rating_5_count: 1,
      }),
    ).toBe(3);
  });
});

describe("bathroomAverageRatingLabel", () => {
  test("formats with one decimal place", () => {
    expect(bathroomAverageRatingLabel(EMPTY_BATHROOM_RATING_COUNTS)).toBe("0.0");
    expect(
      bathroomAverageRatingLabel({
        rating_1_count: 0,
        rating_2_count: 0,
        rating_3_count: 0,
        rating_4_count: 0,
        rating_5_count: 2,
      }),
    ).toBe("5.0");
  });
});

describe("bathroomIncrementRatingCount", () => {
  test("increments the matching star column", () => {
    expect(bathroomIncrementRatingCount(EMPTY_BATHROOM_RATING_COUNTS, 4)).toEqual({
      rating_1_count: 0,
      rating_2_count: 0,
      rating_3_count: 0,
      rating_4_count: 1,
      rating_5_count: 0,
    });
  });

  test("ignores out-of-range stars", () => {
    expect(
      bathroomIncrementRatingCount(EMPTY_BATHROOM_RATING_COUNTS, 0),
    ).toEqual(EMPTY_BATHROOM_RATING_COUNTS);
  });
});

describe("bathroomRatingCountsDescending", () => {
  test("returns counts from 5 stars to 1", () => {
    expect(
      bathroomRatingCountsDescending({
        rating_1_count: 1,
        rating_2_count: 2,
        rating_3_count: 3,
        rating_4_count: 4,
        rating_5_count: 5,
      }),
    ).toEqual([5, 4, 3, 2, 1]);
  });
});

describe("bathroomRatingCountSpacePx", () => {
  test("uses digit width and padding", () => {
    expect(
      bathroomRatingCountSpacePx(
        {
          rating_1_count: 6,
          rating_2_count: 12,
          rating_3_count: 3,
          rating_4_count: 0,
          rating_5_count: 0,
        },
        8,
        4,
      ),
    ).toBe(20);
  });
});

describe("starRatingFillFraction", () => {
  test("returns full, partial, and empty star fills", () => {
    expect(starRatingFillFraction(3.5, 0)).toBe(1);
    expect(starRatingFillFraction(3.5, 2)).toBe(1);
    expect(starRatingFillFraction(3.5, 3)).toBe(0.5);
    expect(starRatingFillFraction(3.5, 4)).toBe(0);
  });
});

describe("bathroomRatingBarFillRatio", () => {
  test("uses the rating count's share of the total", () => {
    expect(bathroomRatingBarFillRatio(6, 18)).toBeCloseTo(1 / 3);
    expect(bathroomRatingBarFillRatio(0, 18)).toBe(0);
    expect(bathroomRatingBarFillRatio(6, 0)).toBe(0);
  });
});

describe("bathroomPostRatingStars", () => {
  test("rounds a valid draft rating to a 1–5 star submission", () => {
    expect(bathroomPostRatingStars(3.6, false)).toBe(4);
  });

  test("rejects cleared, invalid, out-of-range, or already-posting drafts", () => {
    expect(bathroomPostRatingStars(0, false)).toBeNull();
    expect(bathroomPostRatingStars(Number.NaN, false)).toBeNull();
    expect(bathroomPostRatingStars(6, false)).toBeNull();
    expect(bathroomPostRatingStars(4, true)).toBeNull();
  });
});
