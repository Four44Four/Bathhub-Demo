"use client";

import { LOGGED_OUT_MARK_BATHROOM_MESSAGE } from "../../_shared/accounts/AccountReputation";
import { useAccountSession } from "../accounts/AccountSessionContext";
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
import { useAlertSystem } from "../viewport2d/AlertSystem";
import { useUserSettings } from "../user-settings/UserSettingsContext";
import { SwipeUpMainMenuButton } from "./SwipeUpMainMenuButton";
import { useSwipeMenuPage } from "./SwipeMenuPageContext";
import { useViewedAccount } from "./ViewedAccountContext";
import { useSwipeMenuViewport } from "./SwipeMenuShell";

const EDIT_SETTINGS_ICON = createMonoColorImage(
  "/gear_icon.svg",
  SwipeUpMainMenu.ICON_COLOR,
);
const ADD_BATHROOM_ICON = createMonoColorImage(
  "/plus_symbol.svg",
  SwipeUpMainMenu.ICON_COLOR,
);
const ACCOUNT_ICON = createMonoColorImage(
  SwipeUpMainMenu.ACCOUNT_PROFILE_PICTURE_PATH,
  SwipeUpMainMenu.ICON_COLOR,
);

/** Main menu page content (see specifications/swipe_up_menu/main_menu.md). */
export function MainMenuPage() {
  const { widthPx } = useSwipeMenuViewport();
  const { openSettings } = useUserSettings();
  const { enterAddBathroomMode } = useAddBathroomMode();
  const { profile } = useAccountSession();
  const { navigateToPage } = useSwipeMenuPage();
  const { openOwnAccountProfile } = useViewedAccount();
  const { showImportantAlert } = useAlertSystem();
  const accountLabel = profile === null ? "Login" : "Account";
  const rowItems = SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS.map((item, index) =>
    index === 2 ? { ...item, text: accountLabel } : item,
  );

  const rowHeightPx = swipeUpMainMenuRowHeightPx(widthPx, rowItems);
  const editSettingsPosition = swipeUpMainMenuButtonPositionPx(0, widthPx);
  const addBathroomPosition = swipeUpMainMenuButtonPositionPx(1, widthPx);
  const accountPosition = swipeUpMainMenuButtonPositionPx(2, widthPx);

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
          if (profile === null) {
            showImportantAlert({
              message: LOGGED_OUT_MARK_BATHROOM_MESSAGE,
              okLabel: "Ok",
              positive: false,
            });
            return;
          }
          enterAddBathroomMode();
        }}
      />
      <SwipeUpMainMenuButton
        x={accountPosition.x}
        y={accountPosition.y}
        width={SwipeUpMainMenuButtonConsts.FULL_GRID_CELL_WIDTH}
        minHeight={SwipeUpMainMenuButtonConsts.FULL_GRID_ROW_MIN_HEIGHT}
        rowHeightPx={rowHeightPx}
        text={accountLabel}
        image={ACCOUNT_ICON}
        onClick={() => {
          if (profile === null) {
            navigateToPage("login");
            return;
          }
          openOwnAccountProfile();
        }}
      />
    </>
  );
}
