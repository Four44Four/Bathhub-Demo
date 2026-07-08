"use client";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { TextWeight } from "../Utils";

export type SubsettingsRowProps = {
  label: string;
  disabled?: boolean;
  onBlockedInteraction?: () => void;
  onClick: () => void;
};

export function SubsettingsRow({
  label,
  disabled = false,
  onBlockedInteraction,
  onClick,
}: SubsettingsRowProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          onBlockedInteraction?.();
          return;
        }
        onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        padding: "14px 16px",
        border: "none",
        borderBottom: `1px solid ${UserSettingsConsts.ROW_BORDER_COLOR}`,
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        className={TextWeight.REGULAR}
        style={{
          color: UserSettingsConsts.LABEL_COLOR,
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
          color: UserSettingsConsts.SUBPAGE_CHEVRON_COLOR,
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
