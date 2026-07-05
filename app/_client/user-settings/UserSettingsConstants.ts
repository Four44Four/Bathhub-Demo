import { CircularCloseButton } from "../ComponentConstants";
import { lerpHex } from "../Utils";

/** Full-screen user settings overlay; above swipe menu and viewport controls. */
export const USER_SETTINGS_OVERLAY_Z_INDEX = 50;

export const USER_SETTINGS_CLOSE_BTN_SIZE_PX = CircularCloseButton.SIZE_PX;
export const USER_SETTINGS_CLOSE_BTN_INSET_PX = 16;
export const USER_SETTINGS_BOTTOM_SCROLL_MARGIN_PX =
  USER_SETTINGS_CLOSE_BTN_SIZE_PX + USER_SETTINGS_CLOSE_BTN_INSET_PX + 12;

export const USER_SETTINGS_HEADER_FONT_SIZE_PX = 22;
export const USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX = 16;
export const USER_SETTINGS_HEADER_TEXT_COLOR = "#0E0F11";
export const USER_SETTINGS_HEADER_SEPARATOR_BRIGHTNESS_RATIO = 0.7;

export const USER_SETTINGS_PAGE_BG = "#FFFFFF";
export const USER_SETTINGS_HEADER_SEPARATOR_COLOR = lerpHex(
  USER_SETTINGS_HEADER_TEXT_COLOR,
  USER_SETTINGS_PAGE_BG,
  USER_SETTINGS_HEADER_SEPARATOR_BRIGHTNESS_RATIO,
);
export const USER_SETTINGS_ROW_BORDER_COLOR = "#E6E6F0";
export const USER_SETTINGS_LABEL_COLOR = "#3A3D4A";
export const USER_SETTINGS_SUBPAGE_CHEVRON_COLOR = "#B5B5C4";
export const USER_SETTINGS_DANGER_BAND_MESSAGE =
  "Danger: user settings cannot be changed";
