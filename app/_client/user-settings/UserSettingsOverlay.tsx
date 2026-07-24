"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { userSettingsBreadcrumbSegments } from "@/app/_shared/user-settings/UserSettingsBreadcrumb";
import {
  USER_SETTINGS_PAGES,
  type UserSettingsPageId,
  type UserSettingsPageItem,
  type UserSettingsBooleanColumnName,
  type UserSettingsNumericColumnName,
} from "@/app/_shared/user-settings/UserSettingsPageDefinition";
import type { UserSettingsRow } from "@/app/_shared/user-settings/UserSettingsSchema";
import { userSettingsBottomButtonPositionsPx } from "@/app/_client/pure/user-settings/UserSettingsBottomButtonLayout";
import { useAlertSystem } from "../viewport2d/AlertSystem";
import { BooleanSettingRow } from "./BooleanSettingRow";
import { NumberSliderSettingRow } from "./NumberSliderSettingRow";
import { SettingsBackButton } from "./SettingsBackButton";
import { CircularCloseButton } from "../CircularCloseButton";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsSaveChangesButton } from "./SettingsSaveChangesButton";
import { SubsettingsRow } from "./SubsettingsRow";
import {
  buildUnsavedChangesAlertButtons,
  resolveSettingsCloseInteraction,
  resolveSettingsSaveInteraction,
  shouldShowSaveChangesButton,
  USER_SETTINGS_MIGRATION_FAILURE_SAVE_ALERT,
  USER_SETTINGS_UNSAVED_CHANGES_ALERT,
} from "@/app/_shared/user-settings/UserSettingsOverlayBehavior";
import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { useUserSettings } from "./UserSettingsContext";

function renderSettingItem(
  item: UserSettingsPageItem,
  settings: UserSettingsRow,
  handlers: {
    setPendingBoolean: (
      column: UserSettingsBooleanColumnName,
      value: boolean,
    ) => void;
    setPendingInt: (
      column: UserSettingsNumericColumnName,
      value: number,
    ) => void;
    pushPage: (pageId: UserSettingsPageId) => void;
    onBlockedInteraction?: () => void;
    changesDisabled: boolean;
  },
) {
  const notifyBlocked = () => {
    if (handlers.changesDisabled) {
      handlers.onBlockedInteraction?.();
    }
  };

  switch (item.type) {
    case "boolean":
      return (
        <BooleanSettingRow
          key={item.column}
          label={item.label}
          checked={settings[item.column]}
          disabled={handlers.changesDisabled}
          onBlockedInteraction={notifyBlocked}
          onChange={(checked) => {
            if (handlers.changesDisabled) {
              return;
            }
            handlers.setPendingBoolean(item.column, checked);
          }}
        />
      );
    case "slider-int":
      return (
        <NumberSliderSettingRow
          key={item.column}
          label={item.label}
          value={settings[item.column]}
          min={item.min}
          max={item.max}
          integer
          disabled={handlers.changesDisabled}
          onBlockedInteraction={notifyBlocked}
          onChange={(value) => {
            if (handlers.changesDisabled) {
              return;
            }
            handlers.setPendingInt(item.column, value);
          }}
        />
      );
    case "slider-float":
      return (
        <NumberSliderSettingRow
          key={item.column}
          label={item.label}
          value={settings[item.column]}
          min={item.min}
          max={item.max}
          integer={false}
          disabled={handlers.changesDisabled}
          onBlockedInteraction={notifyBlocked}
          onChange={(value) => {
            if (handlers.changesDisabled) {
              return;
            }
            handlers.setPendingInt(item.column, value);
          }}
        />
      );
    case "subpage":
      return (
        <SubsettingsRow
          key={item.pageId}
          label={item.label}
          disabled={handlers.changesDisabled}
          onBlockedInteraction={notifyBlocked}
          onClick={() => {
            if (handlers.changesDisabled) {
              return;
            }
            handlers.pushPage(item.pageId);
          }}
        />
      );
    default:
      return null;
  }
}

export function UserSettingsOverlay() {
  const {
    isOpen,
    pageStack,
    currentPageId,
    pendingSettings,
    hasEditedSettings,
    isSaving,
    schemaUpdateHasErrored,
    closeSettingsWithoutSave,
    popPage,
    pushPage,
    setPendingBoolean,
    setPendingInt,
    savePendingChanges,
  } = useUserSettings();
  const { showImportantAlert } = useAlertSystem();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [bottomButtonsAnchor, setBottomButtonsAnchor] =
    useState<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const target = overlayRef.current;
    if (!target) {
      return;
    }

    const measure = () => {
      const rect = target.getBoundingClientRect();
      setViewportSize({
        width: rect.width,
        height: rect.height,
      });
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => measure());
    observer.observe(target);
    return () => observer.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentPageId]);

  if (!isOpen) {
    return null;
  }

  const page = USER_SETTINGS_PAGES[currentPageId];
  const headerSegments = userSettingsBreadcrumbSegments(pageStack);
  const showBackButton = pageStack.length > 1;
  const showSaveButton = shouldShowSaveChangesButton(hasEditedSettings);
  const bottomButtonPositions =
    viewportSize.width > 0 && viewportSize.height > 0
      ? userSettingsBottomButtonPositionsPx({
          viewportWidthPx: viewportSize.width,
          viewportHeightPx: viewportSize.height,
          closeButtonSizePx: UserSettingsConsts.CLOSE_BTN_SIZE_PX,
          insetPx: UserSettingsConsts.CLOSE_BTN_INSET_PX,
          actionButtonPaddingHorizontalPx:
            UserSettingsConsts.ACTION_BUTTON_PADDING_HORIZONTAL_PX,
          actionButtonPaddingVerticalPx:
            UserSettingsConsts.ACTION_BUTTON_PADDING_VERTICAL_PX,
          actionButtonOutlineThicknessPx:
            UserSettingsConsts.ACTION_BUTTON_OUTLINE_THICKNESS_PX,
          bottomButtonGapPx: UserSettingsConsts.BOTTOM_BUTTON_GAP_PX,
          showBackButton,
          showSaveButton,
        })
      : null;

  const showMigrationFailureAlert = () => {
    showImportantAlert({
      ...USER_SETTINGS_MIGRATION_FAILURE_SAVE_ALERT,
      positive: false,
    });
  };

  const handleClose = () => {
    const interaction = resolveSettingsCloseInteraction(
      hasEditedSettings,
      schemaUpdateHasErrored,
    );
    if (interaction.action === "close_immediately") {
      closeSettingsWithoutSave();
      return;
    }
    showImportantAlert({
      message: USER_SETTINGS_UNSAVED_CHANGES_ALERT.message,
      positive: false,
      buttons: buildUnsavedChangesAlertButtons(closeSettingsWithoutSave),
    });
  };

  const handleSave = () => {
    const interaction = resolveSettingsSaveInteraction(schemaUpdateHasErrored);
    if (interaction.action === "show_migration_failure_alert") {
      showMigrationFailureAlert();
      return;
    }
    void savePendingChanges();
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: UserSettingsConsts.OVERLAY_Z_INDEX,
        backgroundColor: UserSettingsConsts.PAGE_BG,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: UserSettingsConsts.BOTTOM_SCROLL_MARGIN_PX,
        }}
      >
        <SettingsHeader segments={headerSegments} />
        {pendingSettings != null
          ? page.items.map((item) =>
              renderSettingItem(item, pendingSettings, {
                setPendingBoolean,
                setPendingInt,
                pushPage,
                changesDisabled: schemaUpdateHasErrored,
                onBlockedInteraction: showMigrationFailureAlert,
              }),
            )
          : null}
      </div>
      <div
        ref={setBottomButtonsAnchor}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        {bottomButtonPositions != null ? (
          <>
            <div
              style={{
                position: "absolute",
                left: bottomButtonPositions.close.x,
                top: bottomButtonPositions.close.y,
                pointerEvents: "auto",
              }}
            >
              <CircularCloseButton
                ariaLabel="Close settings"
                onClick={handleClose}
              />
            </div>
            {showBackButton && bottomButtonPositions.back != null ? (
              <SettingsBackButton
                anchorElement={bottomButtonsAnchor}
                x={bottomButtonPositions.back.x}
                y={bottomButtonPositions.back.y}
                onClick={popPage}
              />
            ) : null}
            {showSaveButton && bottomButtonPositions.save != null ? (
              <SettingsSaveChangesButton
                anchorElement={bottomButtonsAnchor}
                x={bottomButtonPositions.save.x}
                y={bottomButtonPositions.save.y}
                isSaving={isSaving}
                onClick={handleSave}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
