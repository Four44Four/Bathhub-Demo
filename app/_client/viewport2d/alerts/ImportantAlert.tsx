"use client";

import type { CSSProperties } from "react";

import { Alerts as AlertConsts, BtnInteractAnim, Menus as MenuConsts } from "../../ComponentConstants";
import type { ImportantAlertButton } from "../../pure/viewport2d/AlertSystemState";
import { Button } from "../Button";
import { TextWeight } from "../../Utils";

const IMPORTANT_ALERT_PANEL_BG_COLOR = "#ffffff";
const IMPORTANT_ALERT_TEXT_COLOR = "#0E0F11";
const IMPORTANT_ALERT_ACCENT_BUTTON_TEXT_COLOR = AlertConsts.TEXT_COLOR;
const IMPORTANT_ALERT_SECONDARY_BUTTON_BORDER_COLOR = "#E4E4FF";
/** Button row width as a percentage of the alert panel background width (edge to edge). */
const IMPORTANT_ALERT_BUTTON_ROW_WIDTH_PERCENTAGE = 90;

export type ImportantAlertProps = {
  message: string;
  positive: boolean;
  buttons: ImportantAlertButton[];
  onDismissImportant: () => void;
};

export function ImportantAlert({
  message,
  positive,
  buttons,
  onDismissImportant,
}: ImportantAlertProps) {
  const accentColor = positive
    ? AlertConsts.POSITIVE_ACCENT_COLOR
    : AlertConsts.NEGATIVE_ACCENT_COLOR;

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 30000,
    backgroundColor: MenuConsts.BACKDROP_COLOR,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "none",
  };

  const panelStyle: CSSProperties = {
    maxWidth: 320,
    width: "calc(100% - 48px)",
    padding: "20px 0 16px",
    borderRadius: 12,
    backgroundColor: IMPORTANT_ALERT_PANEL_BG_COLOR,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.28)",
    boxSizing: "border-box",
    pointerEvents: "auto",
  };

  const handleButtonClick = (button: ImportantAlertButton) => {
    button.onClick?.();
    onDismissImportant();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={backdropStyle}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div style={panelStyle}>
        <p
          className={TextWeight.REGULAR}
          style={{
            margin: 0,
            padding: "0 18px",
            color: IMPORTANT_ALERT_TEXT_COLOR,
            fontSize: 15,
            lineHeight: 1.45,
            textAlign: "center",
          }}
        >
          {message}
        </p>
        <div
          style={{
            marginTop: 18,
            marginLeft: "auto",
            marginRight: "auto",
            width: `${IMPORTANT_ALERT_BUTTON_ROW_WIDTH_PERCENTAGE}%`,
            display: "flex",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {buttons.map((button) => {
            const isAccent = button.style === "accent";
            return (
              <div
                key={button.label}
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                  height: 40,
                }}
              >
                <Button
                  x={0}
                  y={0}
                  width="100%"
                  text={button.label}
                  textWeight={TextWeight.BOLD}
                  fillColor={
                    isAccent
                      ? accentColor
                      : IMPORTANT_ALERT_PANEL_BG_COLOR
                  }
                  outlineColor={
                    isAccent
                      ? accentColor
                      : IMPORTANT_ALERT_SECONDARY_BUTTON_BORDER_COLOR
                  }
                  textColor={
                    isAccent
                      ? IMPORTANT_ALERT_ACCENT_BUTTON_TEXT_COLOR
                      : IMPORTANT_ALERT_TEXT_COLOR
                  }
                  interactBrightnessMult={
                    isAccent
                      ? BtnInteractAnim.BTN_COLOR_VALUE_FACTOR_MULT
                      : undefined
                  }
                  onClick={() => handleButtonClick(button)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
