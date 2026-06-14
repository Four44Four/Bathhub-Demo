"use client";

import { useEffect, useRef } from "react";

import { userSettingsBreadcrumbSegments } from "@/app/_shared/user-settings/UserSettingsBreadcrumb";
import {
  USER_SETTINGS_PAGES,
  type UserSettingsPageId,
  type UserSettingsPageItem,
} from "@/app/_shared/user-settings/UserSettingsPageDefinition";
import { BooleanSettingRow } from "./BooleanSettingRow";
import { NumberSliderSettingRow } from "./NumberSliderSettingRow";
import { SettingsBackButton } from "./SettingsBackButton";
import { SettingsCloseButton } from "./SettingsCloseButton";
import { SettingsHeader } from "./SettingsHeader";
import { SubsettingsRow } from "./SubsettingsRow";
import { useUserSettings } from "./UserSettingsContext";
import {
  USER_SETTINGS_BOTTOM_SCROLL_MARGIN_PX,
  USER_SETTINGS_CLOSE_BTN_INSET_PX,
  USER_SETTINGS_OVERLAY_Z_INDEX,
  USER_SETTINGS_PAGE_BG,
} from "./UserSettingsConstants";
import { useUserSettingsValues } from "./useUserSettingsValues";

function renderSettingItem(
  item: UserSettingsPageItem,
  settings: NonNullable<ReturnType<typeof useUserSettingsValues>["settings"]>,
  handlers: {
    setBoolean: ReturnType<typeof useUserSettingsValues>["setBoolean"];
    setInt: ReturnType<typeof useUserSettingsValues>["setInt"];
    pushPage: (pageId: UserSettingsPageId) => void;
  },
) {
  switch (item.type) {
    case "boolean":
      return (
        <BooleanSettingRow
          key={item.column}
          label={item.label}
          checked={settings[item.column]}
          onChange={(checked) => {
            void handlers.setBoolean(item.column, checked);
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
          onChange={(value) => {
            void handlers.setInt(item.column, value);
          }}
        />
      );
    case "subpage":
      return (
        <SubsettingsRow
          key={item.pageId}
          label={item.label}
          onClick={() => handlers.pushPage(item.pageId)}
        />
      );
    default:
      return null;
  }
}

export function UserSettingsOverlay() {
  const { isOpen, pageStack, currentPageId, closeSettings, popPage, pushPage } =
    useUserSettings();
  const { settings, setBoolean, setInt } = useUserSettingsValues();
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: USER_SETTINGS_OVERLAY_Z_INDEX,
        backgroundColor: USER_SETTINGS_PAGE_BG,
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
          paddingBottom: USER_SETTINGS_BOTTOM_SCROLL_MARGIN_PX,
        }}
      >
        <SettingsHeader segments={headerSegments} />
        {settings != null
          ? page.items.map((item) =>
              renderSettingItem(item, settings, {
                setBoolean,
                setInt,
                pushPage,
              }),
            )
          : null}
      </div>
      <div
        style={{
          position: "absolute",
          right: USER_SETTINGS_CLOSE_BTN_INSET_PX,
          bottom: USER_SETTINGS_CLOSE_BTN_INSET_PX,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 12,
          pointerEvents: "none",
        }}
      >
        {showBackButton ? (
          <div style={{ pointerEvents: "auto" }}>
            <SettingsBackButton onClick={popPage} />
          </div>
        ) : null}
        <div style={{ pointerEvents: "auto" }}>
          <SettingsCloseButton onClick={closeSettings} />
        </div>
      </div>
    </div>
  );
}
