"use client";

import { createMonoColorImage } from "../pure/Image";
import {
  SwipeUpMainMenu,
  SwipeUpMainMenuButton as SwipeUpMainMenuButtonConsts,
} from "../ComponentConstants";
import {
  SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
  swipeUpMainMenuButtonPositionPx,
  swipeUpMainMenuRowHeightPx,
} from "../pure/swipeup/MainMenuLayout";
import { useAddBathroomMode } from "../viewport2d/add-bathroom-mode";
import { useUserSettings } from "../user-settings/UserSettingsContext";
import { SwipeUpMainMenuButton } from "./SwipeUpMainMenuButton";
import { useSwipeMenuViewport } from "./SwipeMenuShell";

const EDIT_SETTINGS_ICON = createMonoColorImage(
  "/gear_icon.svg",
  SwipeUpMainMenu.ICON_COLOR,
);
const ADD_BATHROOM_ICON = createMonoColorImage(
  "/plus_symbol.svg",
  SwipeUpMainMenu.ICON_COLOR,
);

/** Main menu page content (see specifications/swipe_up_menu/main_menu.md). */
export function MainMenuPage() {
  const { widthPx } = useSwipeMenuViewport();
  const { openSettings } = useUserSettings();
  const { enterAddBathroomMode } = useAddBathroomMode();

  const rowHeightPx = swipeUpMainMenuRowHeightPx(
    widthPx,
    SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
  );
  const editSettingsPosition = swipeUpMainMenuButtonPositionPx(0, widthPx);
  const addBathroomPosition = swipeUpMainMenuButtonPositionPx(1, widthPx);

  return (
    <>
      <SwipeUpMainMenuButton
        x={editSettingsPosition.x}
        y={editSettingsPosition.y}
        width={SwipeUpMainMenuButtonConsts.FULL_GRID_CELL_WIDTH}
        minHeight={SwipeUpMainMenuButtonConsts.FULL_GRID_ROW_MIN_HEIGHT}
        rowHeightPx={rowHeightPx}
        text="Edit user settings"
        image={EDIT_SETTINGS_ICON}
        onClick={() => {
          openSettings();
        }}
      />
      <SwipeUpMainMenuButton
        x={addBathroomPosition.x}
        y={addBathroomPosition.y}
        width={SwipeUpMainMenuButtonConsts.FULL_GRID_CELL_WIDTH}
        minHeight={SwipeUpMainMenuButtonConsts.FULL_GRID_ROW_MIN_HEIGHT}
        rowHeightPx={rowHeightPx}
        text="Add bathroom"
        image={ADD_BATHROOM_ICON}
        onClick={() => {
          enterAddBathroomMode();
        }}
      />
    </>
  );
}
