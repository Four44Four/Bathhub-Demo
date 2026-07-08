"use client";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { booleanToggleKnobOffsetPx } from "../pure/user-settings/UserSettingsSliderLayout";
import { TextWeight } from "../Utils";

const TRACK_WIDTH_PX = UserSettingsConsts.BOOLEAN_SWITCH_TRACK_WIDTH_PX;
const TRACK_HEIGHT_PX = UserSettingsConsts.BOOLEAN_SWITCH_TRACK_HEIGHT_PX;
const KNOB_SIZE_PX = UserSettingsConsts.BOOLEAN_SWITCH_KNOB_SIZE_PX;
const TRACK_PADDING_PX = (TRACK_HEIGHT_PX - KNOB_SIZE_PX) / 2;

export type BooleanSettingRowProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onBlockedInteraction?: () => void;
  onChange: (checked: boolean) => void;
};

export function BooleanSettingRow({
  label,
  checked,
  disabled = false,
  onBlockedInteraction,
  onChange,
}: BooleanSettingRowProps) {
  const knobOffsetPx = booleanToggleKnobOffsetPx(
    checked,
    TRACK_WIDTH_PX,
    KNOB_SIZE_PX,
    TRACK_PADDING_PX,
  );

  return (
    <label
      aria-disabled={disabled}
      onPointerDown={(event) => {
        if (!disabled) return;
        event.preventDefault();
        onBlockedInteraction?.();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 16px",
        borderBottom: `1px solid ${UserSettingsConsts.ROW_BORDER_COLOR}`,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        className={TextWeight.REGULAR}
        style={{
          color: UserSettingsConsts.LABEL_COLOR,
          fontSize: 15,
          lineHeight: 1.3,
          textAlign: "left",
        }}
      >
        {label}
      </span>
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          flexShrink: 0,
          width: TRACK_WIDTH_PX,
          height: TRACK_HEIGHT_PX,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          readOnly={disabled}
          onChange={(event) => {
            if (disabled) return;
            onChange(event.target.checked);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            opacity: 0,
            cursor: "pointer",
            zIndex: 1,
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: TRACK_HEIGHT_PX / 2,
            backgroundColor: checked
              ? UserSettingsConsts.COMPONENT_ACCENT_COLOR
              : UserSettingsConsts.COMPONENT_BG_COLOR,
            transition: "background-color 150ms ease",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: TRACK_PADDING_PX,
            left: 0,
            width: KNOB_SIZE_PX,
            height: KNOB_SIZE_PX,
            borderRadius: "50%",
            backgroundColor: checked
              ? UserSettingsConsts.COMPONENT_KNOB_COLOR
              : UserSettingsConsts.COMPONENT_BOOLEAN_OFF_KNOB_COLOR,
            transform: `translateX(${knobOffsetPx}px)`,
            transition: "transform 150ms ease, background-color 150ms ease",
            pointerEvents: "none",
          }}
        />
      </span>
    </label>
  );
}
