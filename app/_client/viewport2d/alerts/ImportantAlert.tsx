"use client";

import type { CSSProperties } from "react";

import { Alerts as AlertConsts, Menus as MenuConsts } from "../../ComponentConstants";
import { Button } from "../Button";
import { TextWeight } from "../../Utils";

const IMPORTANT_ALERT_PANEL_BG_COLOR = "#ffffff";
const IMPORTANT_ALERT_TEXT_COLOR = "#0E0F11";
const IMPORTANT_ALERT_OK_TEXT_COLOR = AlertConsts.TEXT_COLOR;
/** Ok button width as a percentage of the alert panel background width (edge to edge). */
const IMPORTANT_ALERT_OK_BUTTON_WIDTH_PERCENTAGE = 90;

export type ImportantAlertProps = {
  message: string;
  okLabel?: string;
  positive: boolean;
  onDismiss: () => void;
};

export function ImportantAlert({
  message,
  okLabel = "Ok",
  positive,
  onDismiss,
}: ImportantAlertProps) {
  const okAccentColor = positive
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
            width: `${IMPORTANT_ALERT_OK_BUTTON_WIDTH_PERCENTAGE}%`,
            position: "relative",
            height: 40,
          }}
        >
          <Button
            x={0}
            y={0}
            width="100%"
            text={okLabel}
            textWeight={TextWeight.BOLD}
            fillColor={okAccentColor}
            outlineColor={okAccentColor}
            textColor={IMPORTANT_ALERT_OK_TEXT_COLOR}
            onClick={onDismiss}
          />
        </div>
      </div>
    </div>
  );
}
