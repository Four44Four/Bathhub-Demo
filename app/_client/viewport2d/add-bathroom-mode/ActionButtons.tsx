"use client";

import type { CSSProperties, MouseEventHandler } from "react";

import {
  Button as ButtonConsts,
  Shared as SharedConsts,
} from "../../ComponentConstants";
import {
  ADD_BATHROOM_ACTION_BUTTON_BOTTOM_MARGIN_PX,
  ADD_BATHROOM_ACTION_BUTTON_GAP_PX,
  ADD_BATHROOM_ACTION_BUTTON_HEIGHT_PX,
  ADD_BATHROOM_ACTION_BUTTON_SIDE_MARGIN_PX,
  ADD_BATHROOM_ACTION_ICON_SIZE_PX,
  ADD_BATHROOM_CANCEL_ICON,
  ADD_BATHROOM_CONFIRM_ICON,
} from "./Constants";
import { useRecoloredSvgSrc } from "./useRecoloredSvgSrc";

export type ActionButtonsProps = {
  disabled?: boolean;
  onCancel: MouseEventHandler<HTMLButtonElement>;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
};

function actionButtonStyle(fillColor: string, disabled: boolean): CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    height: ADD_BATHROOM_ACTION_BUTTON_HEIGHT_PX,
    margin: 0,
    padding: 0,
    border: `${ButtonConsts.LINE_THICKNESS}px solid ${fillColor}`,
    borderRadius: ButtonConsts.CORNER_RADIUS,
    backgroundColor: fillColor,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };
}

function actionIconStyle(): CSSProperties {
  return {
    height: ADD_BATHROOM_ACTION_ICON_SIZE_PX,
    width: "auto",
    display: "block",
    userSelect: "none",
  };
}

type ActionIconProps = {
  path: string;
};

function ActionIcon({ path }: ActionIconProps) {
  const src = useRecoloredSvgSrc(
    path,
    SharedConsts.ICON_ON_TINTED_BUTTON_COLOR,
  );
  if (!src) return null;

  return <img src={src} alt="" draggable={false} style={actionIconStyle()} />;
}

export function ActionButtons({
  disabled = false,
  onCancel,
  onConfirm,
}: ActionButtonsProps) {
  const rowStyle: CSSProperties = {
    position: "absolute",
    left: ADD_BATHROOM_ACTION_BUTTON_SIDE_MARGIN_PX,
    right: ADD_BATHROOM_ACTION_BUTTON_SIDE_MARGIN_PX,
    bottom: ADD_BATHROOM_ACTION_BUTTON_BOTTOM_MARGIN_PX,
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    gap: ADD_BATHROOM_ACTION_BUTTON_GAP_PX,
    pointerEvents: "auto",
  };

  const cancelBg = SharedConsts.NEGATIVE_COLOR;
  const confirmBg = SharedConsts.POSITIVE_COLOR;

  return (
    <div style={rowStyle}>
      <button
        type="button"
        aria-label="Cancel add bathroom"
        disabled={disabled}
        style={actionButtonStyle(cancelBg, disabled)}
        onClick={onCancel}
      >
        <ActionIcon path={ADD_BATHROOM_CANCEL_ICON} />
      </button>
      <button
        type="button"
        aria-label="Confirm add bathroom"
        disabled={disabled}
        style={actionButtonStyle(confirmBg, disabled)}
        onClick={onConfirm}
      >
        <ActionIcon path={ADD_BATHROOM_CONFIRM_ICON} />
      </button>
    </div>
  );
}
