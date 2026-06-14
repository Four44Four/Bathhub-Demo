"use client";

import { TextWeight } from "../Utils";
import {
  USER_SETTINGS_LABEL_COLOR,
  USER_SETTINGS_ROW_BORDER_COLOR,
  USER_SETTINGS_SUBPAGE_CHEVRON_COLOR,
} from "./UserSettingsConstants";

export type SubsettingsRowProps = {
  label: string;
  onClick: () => void;
};

export function SubsettingsRow({ label, onClick }: SubsettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        padding: "14px 16px",
        border: "none",
        borderBottom: `1px solid ${USER_SETTINGS_ROW_BORDER_COLOR}`,
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        className={TextWeight.REGULAR}
        style={{
          color: USER_SETTINGS_LABEL_COLOR,
          fontSize: 15,
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={TextWeight.BOLD}
        style={{
          color: USER_SETTINGS_SUBPAGE_CHEVRON_COLOR,
          fontSize: 18,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        &gt;
      </span>
    </button>
  );
}
