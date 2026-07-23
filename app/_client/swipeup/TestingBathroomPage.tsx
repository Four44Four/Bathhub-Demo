"use client";

import type { CSSProperties } from "react";

import { TestingBathroomPage as TestingBathroomPageConsts } from "../ComponentConstants";
import { TextWeight } from "../Utils";

/** Testing bathroom page shown from the viewport2d testing button. */
export function TestingBathroomPage() {
  const labelStyle: CSSProperties = {
    position: "absolute",
    top: TestingBathroomPageConsts.TEXT_TOP_OFFSET_PX,
    left: 0,
    right: 0,
    margin: 0,
    color: "#000000",
    fontSize: TestingBathroomPageConsts.TEXT_FONT_SIZE_PX,
    lineHeight: TestingBathroomPageConsts.TEXT_LINE_HEIGHT,
    textAlign: "center",
  };

  return (
    <p className={TextWeight.BOLD} style={labelStyle}>
      {TestingBathroomPageConsts.TEXT}
    </p>
  );
}
