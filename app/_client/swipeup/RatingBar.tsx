"use client";

import type { CSSProperties } from "react";

import { BathroomPage as BathroomPageConsts } from "../ComponentConstants";
import { bathroomRatingBarFillRatio } from "../pure/bathroom/BathroomRating";
import { TextWeight } from "../Utils";

export type RatingBarProps = {
  ratingCount: number;
  ratingCountSpace: number;
  ratingTotalCount: number;
  leftColor: string;
  unfilledColor?: string;
  barHeightPx?: number;
};

export function RatingBar({
  ratingCount,
  ratingCountSpace,
  ratingTotalCount,
  leftColor,
  unfilledColor = BathroomPageConsts.STAR_RATING_UNFILL_COLOR,
  barHeightPx = BathroomPageConsts.RATING_BAR_HEIGHT_PX,
}: RatingBarProps) {
  const fillRatio = bathroomRatingBarFillRatio(
    ratingCount,
    ratingTotalCount,
  );

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: BathroomPageConsts.RATING_BAR_GAP_PX,
    width: "100%",
  };

  const countStyle: CSSProperties = {
    width: ratingCountSpace,
    flexShrink: 0,
    textAlign: "right",
    color: BathroomPageConsts.TEXT_COLOR,
    fontSize: 14,
    lineHeight: 1.2,
  };

  const trackStyle: CSSProperties = {
    flex: 1,
    height: barHeightPx,
    display: "flex",
    borderRadius: barHeightPx / 2,
    overflow: "hidden",
    backgroundColor: unfilledColor,
  };

  const fillStyle: CSSProperties = {
    width: `${fillRatio * 100}%`,
    height: "100%",
    backgroundColor: leftColor,
  };

  return (
    <div style={rowStyle}>
      <span className={TextWeight.REGULAR} style={countStyle}>
        {ratingCount}
      </span>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
    </div>
  );
}
