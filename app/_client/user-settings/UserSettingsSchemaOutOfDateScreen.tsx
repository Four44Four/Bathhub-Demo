"use client";

import { TextWeight } from "../Utils";
import {
  USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX,
  USER_SETTINGS_PAGE_BG,
} from "./UserSettingsConstants";

export function UserSettingsSchemaOutOfDateScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        backgroundColor: USER_SETTINGS_PAGE_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX,
        boxSizing: "border-box",
      }}
    >
      <p
        className={TextWeight.BOLD}
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.4,
          textAlign: "center",
          color: "#0E0F11",
        }}
      >
        Schema out of date
      </p>
    </div>
  );
}
