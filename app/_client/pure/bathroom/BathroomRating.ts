import type { BathroomDataPrimaryFullRow } from "../../../_shared/BathroomDataPrimary";

/** Per-star rating counts for a bathroom (see specifications/bathroom_db.md). */
export type BathroomRatingCounts = {
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
};

export const EMPTY_BATHROOM_RATING_COUNTS: BathroomRatingCounts = {
  rating_1_count: 0,
  rating_2_count: 0,
  rating_3_count: 0,
  rating_4_count: 0,
  rating_5_count: 0,
};

export function bathroomRatingCountsFromFullRow(
  row: Pick<
    BathroomDataPrimaryFullRow,
    | "rating_1_count"
    | "rating_2_count"
    | "rating_3_count"
    | "rating_4_count"
    | "rating_5_count"
  >,
): BathroomRatingCounts {
  return {
    rating_1_count: row.rating_1_count,
    rating_2_count: row.rating_2_count,
    rating_3_count: row.rating_3_count,
    rating_4_count: row.rating_4_count,
    rating_5_count: row.rating_5_count,
  };
}

const RATING_COUNT_KEYS: Array<keyof BathroomRatingCounts> = [
  "rating_1_count",
  "rating_2_count",
  "rating_3_count",
  "rating_4_count",
  "rating_5_count",
];

/** Sum of all rating count columns. */
export function bathroomTotalRatingCount(counts: BathroomRatingCounts): number {
  return (
    counts.rating_1_count +
    counts.rating_2_count +
    counts.rating_3_count +
    counts.rating_4_count +
    counts.rating_5_count
  );
}

/**
 * Weighted average star rating (see specifications/swipe_up_menu/bathroom_page.md).
 * Returns 0 when there are no ratings.
 */
export function bathroomAverageRating(counts: BathroomRatingCounts): number {
  const total = bathroomTotalRatingCount(counts);
  if (total <= 0) {
    return 0;
  }
  const weighted =
    counts.rating_1_count * 1 +
    counts.rating_2_count * 2 +
    counts.rating_3_count * 3 +
    counts.rating_4_count * 4 +
    counts.rating_5_count * 5;
  return weighted / total;
}

/** Average rounded to one decimal place for display. */
export function bathroomAverageRatingRounded(counts: BathroomRatingCounts): number {
  const average = bathroomAverageRating(counts);
  return Math.round(average * 10) / 10;
}

/** String form of the rounded average (one decimal place). */
export function bathroomAverageRatingLabel(counts: BathroomRatingCounts): string {
  return bathroomAverageRatingRounded(counts).toFixed(1);
}

/** Increments the column for a 1–5 star user rating. */
export function bathroomIncrementRatingCount(
  counts: BathroomRatingCounts,
  stars: number,
): BathroomRatingCounts {
  const roundedStars = Math.round(stars);
  if (roundedStars < 1 || roundedStars > 5) {
    return counts;
  }
  const key = `rating_${roundedStars}_count` as keyof BathroomRatingCounts;
  return {
    ...counts,
    [key]: counts[key] + 1,
  };
}

/** All rating count values as an array from 5 stars down to 1. */
export function bathroomRatingCountsDescending(
  counts: BathroomRatingCounts,
): number[] {
  return [
    counts.rating_5_count,
    counts.rating_4_count,
    counts.rating_3_count,
    counts.rating_2_count,
    counts.rating_1_count,
  ];
}

/**
 * Estimated CSS pixel width for the widest rating count label plus padding.
 * Uses a fixed per-digit width suitable for tabular digits at 14px.
 */
export function bathroomRatingCountSpacePx(
  counts: BathroomRatingCounts,
  digitWidthPx: number,
  paddingPx: number,
): number {
  const maxCount = Math.max(...RATING_COUNT_KEYS.map((key) => counts[key]));
  const digitCount = Math.max(1, String(maxCount).length);
  return digitCount * digitWidthPx + paddingPx;
}

/** Fill fraction (0–1) for a single star at `starIndex` (0 = leftmost). */
export function starRatingFillFraction(
  rating: number,
  starIndex: number,
): number {
  return Math.max(0, Math.min(1, rating - starIndex));
}
