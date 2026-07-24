"use client";

import { TextWeight } from "../../Utils";
import { Viewport2dButton as Viewport2dButtonConsts } from "../../ComponentConstants";
import { useSwipeMenuPage } from "../../swipeup/SwipeMenuPageContext";
import {
  showSwipeUpMenuButtonLeftPx,
  showSwipeUpMenuButtonOuterSidePx,
  showSwipeUpMenuButtonTopPx,
  BTN_PADDING_PX,
  BTN_X,
  BTN_Y,
} from "./ShowSwipeUpMenu";
import { Button } from "../Button";

export const BTN_TEXT = "Test";
export const BTN_TEXT_PADDING_PX = 8;

export function showTestingBathroomMenuButtonTopPx(
  showSwipeUpMenuTopPx: number,
  showSwipeUpMenuOuterSidePx: number,
): number {
  return showSwipeUpMenuTopPx + showSwipeUpMenuOuterSidePx;
}

export function showTestingBathroomMenuButtonLeftPx(leftInsetPx: number): number {
  return showSwipeUpMenuButtonLeftPx(leftInsetPx);
}

export type ShowTestingBathroomMenuProps = {
  topInsetPx?: number;
  leftInsetPx?: number;
  paddingPx?: number;
};

export function ShowTestingBathroomMenu({
  topInsetPx = BTN_Y,
  leftInsetPx = BTN_X,
  paddingPx = BTN_TEXT_PADDING_PX,
}: ShowTestingBathroomMenuProps) {
  const { expandToPage } = useSwipeMenuPage();
  const showSwipeUpMenuTop = showSwipeUpMenuButtonTopPx(topInsetPx);
  const showSwipeUpMenuOuterSide = showSwipeUpMenuButtonOuterSidePx(
    Viewport2dButtonConsts.IMAGE_SIZE,
    BTN_PADDING_PX,
  );
  const top = showTestingBathroomMenuButtonTopPx(
    showSwipeUpMenuTop,
    showSwipeUpMenuOuterSide,
  );
  const left = showTestingBathroomMenuButtonLeftPx(leftInsetPx);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top,
        left,
      }}
    >
      <Button
        x={0}
        y={0}
        padding={paddingPx}
        text={BTN_TEXT}
        textWeight={TextWeight.BOLD}
        onClick={() => {
          expandToPage("testingBathroom");
        }}
      />
    </div>
  );
}
