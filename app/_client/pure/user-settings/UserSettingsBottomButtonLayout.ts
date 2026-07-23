import {
  VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX,
  viewport2dButtonTextHeightPx,
} from "../viewport2d/ButtonLayout";

const ACTION_BUTTON_APPROX_CHAR_WIDTH_RATIO = 0.62;

export type UserSettingsBottomButtonPositions = {
  close: { x: number; y: number };
  back: { x: number; y: number } | null;
  save: { x: number; y: number } | null;
};

export function userSettingsCloseButtonPositionPx(
  viewportWidthPx: number,
  viewportHeightPx: number,
  closeButtonSizePx: number,
  insetPx: number,
): { x: number; y: number } {
  return {
    x: viewportWidthPx - insetPx - closeButtonSizePx,
    y: viewportHeightPx - insetPx - closeButtonSizePx,
  };
}

export function userSettingsActionButtonTextWidthPx(text: string): number {
  const approxCharWidthPx =
    VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX * ACTION_BUTTON_APPROX_CHAR_WIDTH_RATIO;
  return text.length * approxCharWidthPx;
}

export function userSettingsActionButtonOuterWidthPx(
  text: string,
  paddingHorizontalPx: number,
  outlineThicknessPx: number,
): number {
  return (
    userSettingsActionButtonTextWidthPx(text) +
    2 * paddingHorizontalPx +
    2 * outlineThicknessPx
  );
}

export function userSettingsActionButtonOuterHeightPx(
  paddingVerticalPx: number,
  outlineThicknessPx: number,
): number {
  return (
    viewport2dButtonTextHeightPx() +
    2 * paddingVerticalPx +
    2 * outlineThicknessPx
  );
}

export function userSettingsActionButtonTopPx(
  closeButtonY: number,
  closeButtonSizePx: number,
  actionButtonHeightPx: number,
): number {
  return closeButtonY + (closeButtonSizePx - actionButtonHeightPx) / 2;
}

export function userSettingsBottomButtonPositionsPx(input: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  closeButtonSizePx: number;
  insetPx: number;
  actionButtonPaddingHorizontalPx: number;
  actionButtonPaddingVerticalPx: number;
  actionButtonOutlineThicknessPx: number;
  bottomButtonGapPx: number;
  showBackButton: boolean;
  showSaveButton: boolean;
}): UserSettingsBottomButtonPositions {
  const close = userSettingsCloseButtonPositionPx(
    input.viewportWidthPx,
    input.viewportHeightPx,
    input.closeButtonSizePx,
    input.insetPx,
  );

  const actionHeightPx = userSettingsActionButtonOuterHeightPx(
    input.actionButtonPaddingVerticalPx,
    input.actionButtonOutlineThicknessPx,
  );
  const actionY = userSettingsActionButtonTopPx(
    close.y,
    input.closeButtonSizePx,
    actionHeightPx,
  );

  const backWidthPx = userSettingsActionButtonOuterWidthPx(
    "Back",
    input.actionButtonPaddingHorizontalPx,
    input.actionButtonOutlineThicknessPx,
  );
  const saveWidthPx = userSettingsActionButtonOuterWidthPx(
    "Save changes",
    input.actionButtonPaddingHorizontalPx,
    input.actionButtonOutlineThicknessPx,
  );

  let anchorX = close.x;

  const back =
    input.showBackButton
      ? {
          x: anchorX - input.bottomButtonGapPx - backWidthPx,
          y: actionY,
        }
      : null;

  if (back != null) {
    anchorX = back.x;
  }

  const save = input.showSaveButton
    ? {
        x: anchorX - input.bottomButtonGapPx - saveWidthPx,
        y: actionY,
      }
    : null;

  return { close, back, save };
}
