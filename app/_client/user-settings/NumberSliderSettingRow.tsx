"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import {
  numberSliderAccentFillWidthPx,
  numberSliderKnobCenterPx,
  numberSliderValueRatio,
} from "../pure/user-settings/UserSettingsSliderLayout";
import { clamp, TextWeight } from "../Utils";
import { USER_SETTINGS_LABEL_COLOR, USER_SETTINGS_ROW_BORDER_COLOR } from "./UserSettingsConstants";

const TRACK_HEIGHT_PX = UserSettingsConsts.NUMBER_SLIDER_TRACK_HEIGHT_PX;
const KNOB_SIZE_PX = UserSettingsConsts.NUMBER_SLIDER_KNOB_SIZE_PX;

export type NumberSliderSettingRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  integer?: boolean;
  onChange: (value: number) => void;
};

export function NumberSliderSettingRow({
  label,
  value,
  min,
  max,
  integer = true,
  onChange,
}: NumberSliderSettingRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidthPx, setTrackWidthPx] = useState(0);

  useLayoutEffect(() => {
    const node = trackRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      setTrackWidthPx(node.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const displayValue = useMemo(() => {
    const clamped = clamp(value, min, max);
    return integer ? Math.round(clamped) : clamped;
  }, [integer, max, min, value]);

  const ratio = numberSliderValueRatio(displayValue, min, max);
  const knobCenterPx = numberSliderKnobCenterPx(ratio, trackWidthPx, KNOB_SIZE_PX);
  const accentFillWidthPx = numberSliderAccentFillWidthPx(knobCenterPx);
  const knobLeftPx = knobCenterPx - KNOB_SIZE_PX / 2;

  const handleChange = (raw: number) => {
    const clamped = clamp(raw, min, max);
    onChange(integer ? Math.round(clamped) : clamped);
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${USER_SETTINGS_ROW_BORDER_COLOR}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <span
          className={TextWeight.REGULAR}
          style={{
            color: USER_SETTINGS_LABEL_COLOR,
            fontSize: 15,
            lineHeight: 1.3,
            textAlign: "left",
          }}
        >
          {label}
        </span>
        <span
          className={TextWeight.BOLD}
          style={{
            color: USER_SETTINGS_LABEL_COLOR,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {displayValue}
        </span>
      </div>
      <div
        ref={trackRef}
        style={{
          position: "relative",
          width: "100%",
          height: KNOB_SIZE_PX,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: (KNOB_SIZE_PX - TRACK_HEIGHT_PX) / 2,
            left: 0,
            right: 0,
            height: TRACK_HEIGHT_PX,
            borderRadius: TRACK_HEIGHT_PX / 2,
            backgroundColor: UserSettingsConsts.COMPONENT_BG_COLOR,
          }}
        />
        {trackWidthPx > 0 ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: (KNOB_SIZE_PX - TRACK_HEIGHT_PX) / 2,
              left: 0,
              width: accentFillWidthPx,
              height: TRACK_HEIGHT_PX,
              borderRadius: TRACK_HEIGHT_PX / 2,
              backgroundColor: UserSettingsConsts.COMPONENT_ACCENT_COLOR,
            }}
          />
        ) : null}
        {trackWidthPx > 0 ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: knobLeftPx,
              width: KNOB_SIZE_PX,
              height: KNOB_SIZE_PX,
              borderRadius: "50%",
              backgroundColor: UserSettingsConsts.COMPONENT_KNOB_COLOR,
              pointerEvents: "none",
            }}
          />
        ) : null}
        <input
          type="range"
          min={min}
          max={max}
          step={integer ? 1 : (max - min) / 100}
          value={displayValue}
          onChange={(event) => handleChange(Number(event.target.value))}
          aria-label={label}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
}
