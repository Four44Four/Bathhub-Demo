import {
  userSettingsActionButtonOuterHeightPx,
  userSettingsActionButtonOuterWidthPx,
  userSettingsBottomButtonPositionsPx,
  userSettingsCloseButtonPositionPx,
} from "../app/_client/pure/user-settings/UserSettingsBottomButtonLayout";
import { UserSettings as UserSettingsConsts } from "../app/_client/ComponentConstants";

const CLOSE_SIZE_PX = 48;
const INSET_PX = 16;
const PADDING_H_PX = 15;
const PADDING_V_PX = 15;
const OUTLINE_PX = 0;
const BOTTOM_BUTTON_GAP_PX = UserSettingsConsts.BOTTOM_BUTTON_GAP_PX;

describe("userSettingsCloseButtonPositionPx", () => {
  test("anchors the close button to the bottom-right inset", () => {
    expect(
      userSettingsCloseButtonPositionPx(320, 640, CLOSE_SIZE_PX, INSET_PX),
    ).toEqual({
      x: 256,
      y: 576,
    });
  });
});

describe("userSettingsActionButtonOuterWidthPx", () => {
  test("includes horizontal padding and outline", () => {
    const backWidthPx = userSettingsActionButtonOuterWidthPx(
      "Back",
      PADDING_H_PX,
      OUTLINE_PX,
    );
    expect(backWidthPx).toBeGreaterThan(32);
    expect(backWidthPx).toBeLessThan(90);
  });
});

describe("userSettingsActionButtonOuterHeightPx", () => {
  test("stays within one pixel of the close button height with the configured padding", () => {
    const heightPx = userSettingsActionButtonOuterHeightPx(
      PADDING_V_PX,
      OUTLINE_PX,
    );
    expect(Math.abs(heightPx - CLOSE_SIZE_PX)).toBeLessThanOrEqual(1.5);
  });
});

describe("userSettingsBottomButtonPositionsPx", () => {
  const baseInput = {
    viewportWidthPx: 320,
    viewportHeightPx: 640,
    closeButtonSizePx: CLOSE_SIZE_PX,
    insetPx: INSET_PX,
    actionButtonPaddingHorizontalPx: PADDING_H_PX,
    actionButtonPaddingVerticalPx: PADDING_V_PX,
    actionButtonOutlineThicknessPx: OUTLINE_PX,
    bottomButtonGapPx: BOTTOM_BUTTON_GAP_PX,
  };

  test("places only the close button when back and save are hidden", () => {
    const positions = userSettingsBottomButtonPositionsPx({
      ...baseInput,
      showBackButton: false,
      showSaveButton: false,
    });

    expect(positions.close).toEqual({ x: 256, y: 576 });
    expect(positions.back).toBeNull();
    expect(positions.save).toBeNull();
  });

  test("uses the configured bottom-button gap from user settings constants", () => {
    expect(BOTTOM_BUTTON_GAP_PX).toBe(10);
    expect(UserSettingsConsts.BOTTOM_BUTTON_CORNER_RADIUS_PX).toBe(15);
  });

  test("places back to the left of close and save as the leftmost button", () => {
    const positions = userSettingsBottomButtonPositionsPx({
      ...baseInput,
      showBackButton: true,
      showSaveButton: true,
    });

    const backWidthPx = userSettingsActionButtonOuterWidthPx(
      "Back",
      PADDING_H_PX,
      OUTLINE_PX,
    );
    const saveWidthPx = userSettingsActionButtonOuterWidthPx(
      "Save changes",
      PADDING_H_PX,
      OUTLINE_PX,
    );

    expect(positions.back).not.toBeNull();
    expect(positions.save).not.toBeNull();
    expect(positions.back!.x).toBe(
      positions.close.x - BOTTOM_BUTTON_GAP_PX - backWidthPx,
    );
    expect(positions.save!.x).toBe(
      positions.back!.x - BOTTOM_BUTTON_GAP_PX - saveWidthPx,
    );
    expect(positions.back!.y).toBe(positions.save!.y);
  });

  test("places save directly left of close when back is hidden", () => {
    const positions = userSettingsBottomButtonPositionsPx({
      ...baseInput,
      showBackButton: false,
      showSaveButton: true,
    });

    const saveWidthPx = userSettingsActionButtonOuterWidthPx(
      "Save changes",
      PADDING_H_PX,
      OUTLINE_PX,
    );

    expect(positions.back).toBeNull();
    expect(positions.save!.x).toBe(
      positions.close.x - BOTTOM_BUTTON_GAP_PX - saveWidthPx,
    );
  });
});
