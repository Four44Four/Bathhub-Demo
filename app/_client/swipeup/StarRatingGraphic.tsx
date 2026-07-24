"use client";

import { useMemo, type CSSProperties } from "react";

import { BathroomPage as BathroomPageConsts } from "../ComponentConstants";
import { starRatingFillFraction } from "../pure/bathroom/BathroomRating";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";

export type StarRatingGraphicProps = {
  rating: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  filledColor?: string;
  unfilledColor?: string;
  starSizePx?: number;
  starGapPx?: number;
};

export function StarRatingGraphic({
  rating,
  interactive = false,
  onRatingChange,
  filledColor = BathroomPageConsts.STAR_RATING_5_FILL_COLOR,
  unfilledColor = BathroomPageConsts.STAR_RATING_UNFILL_COLOR,
  starSizePx = BathroomPageConsts.STAR_ICON_SIZE_PX,
  starGapPx = BathroomPageConsts.STAR_ICON_GAP_PX,
}: StarRatingGraphicProps) {
  const unfilledFilter = useMemo(
    () => blackMonoIconCssFilter(unfilledColor),
    [unfilledColor],
  );
  const filledFilter = useMemo(
    () => blackMonoIconCssFilter(filledColor),
    [filledColor],
  );

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: starGapPx,
  };

  const starStyle: CSSProperties = {
    width: starSizePx,
    height: starSizePx,
    position: "relative",
    flexShrink: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: interactive ? "pointer" : "default",
  };

  return (
    <div style={rowStyle} aria-label={`${rating.toFixed(1)} stars`}>
      {Array.from({ length: 5 }, (_, starIndex) => {
        const fillFraction = starRatingFillFraction(rating, starIndex);
        const filledClipRightPercent = (1 - fillFraction) * 100;
        const starBody = (
          <>
            <img
              src={BathroomPageConsts.STAR_ICON_PATH}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                filter: unfilledFilter,
              }}
            />
            {fillFraction > 0 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: `inset(0 ${filledClipRightPercent}% 0 0)`,
                }}
              >
                <img
                  src={BathroomPageConsts.STAR_ICON_PATH}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    filter: filledFilter,
                  }}
                />
              </div>
            ) : null}
          </>
        );

        if (interactive) {
          return (
            <button
              key={starIndex}
              type="button"
              aria-label={`Rate ${starIndex + 1} stars`}
              style={starStyle}
              onClick={() => onRatingChange?.(starIndex + 1)}
            >
              {starBody}
            </button>
          );
        }

        return (
          <div key={starIndex} style={starStyle} aria-hidden="true">
            {starBody}
          </div>
        );
      })}
    </div>
  );
}
