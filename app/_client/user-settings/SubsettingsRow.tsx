"use client";

import { useMemo } from "react";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import { TextWeight } from "../Utils";
import { useUserSettingsRowHover } from "./useUserSettingsRowHover";

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
  const { rowHoverProps, rowHoverStyle } = useUserSettingsRowHover(disabled);
  const arrowIconFilter = useMemo(
    () => blackMonoIconCssFilter(UserSettingsConsts.SUBPAGE_ARROW_COLOR),
    [],
  );

  return (
    <button
      type="button"
      aria-disabled={disabled}
      {...rowHoverProps}
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
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.55 : 1,
        ...rowHoverStyle,
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
      <img
        src={UserSettingsConsts.SUBPAGE_ARROW_ICON}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          width: UserSettingsConsts.SUBPAGE_ARROW_SIZE_PX,
          height: UserSettingsConsts.SUBPAGE_ARROW_SIZE_PX,
          flexShrink: 0,
          display: "block",
          objectFit: "contain",
          filter: arrowIconFilter,
        }}
      />
    </button>
  );
}
