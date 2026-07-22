"use client";

import { useState, type CSSProperties, type MouseEventHandler } from "react";

import {
  AddBathroom as AddBathroomConsts,
  BtnInteractAnim,
  Viewport2dButton as Viewport2dButtonConsts,
  Shared as SharedConsts,
} from "../../ComponentConstants";
import { multiplyHexColorBrightness } from "../../pure/viewport2d/ButtonInteractColor";
import { useRecoloredSvgSrc } from "./useRecoloredSvgSrc";

export type ActionButtonsProps = {
  disabled?: boolean;
  onCancel: MouseEventHandler<HTMLButtonElement>;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
};

function actionIconStyle(): CSSProperties {
  return {
    height: AddBathroomConsts.ACTION_ICON_SIZE_PX,
    width: "auto",
    display: "block",
    userSelect: "none",
  };
}

type ActionIconProps = {
  path: string;
  iconColor: string;
};

function ActionIcon({ path, iconColor }: ActionIconProps) {
  const src = useRecoloredSvgSrc(path, iconColor);
  if (!src) return null;

  return <img src={src} alt="" draggable={false} style={actionIconStyle()} />;
}

type TintedActionButtonProps = {
  ariaLabel: string;
  fillColor: string;
  disabled: boolean;
  iconPath: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

function TintedActionButton({
  ariaLabel,
  fillColor,
  disabled,
  iconPath,
  onClick,
}: TintedActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = !disabled && (isHovered || isPressed);
  const interactTransition = `${BtnInteractAnim.BTN_INTERACT_DURA_MS}ms ease`;
  const brightnessMult = isHighlighted
    ? BtnInteractAnim.BTN_COLOR_VALUE_FACTOR_MULT
    : 1;
  const resolvedFillColor = multiplyHexColorBrightness(fillColor, brightnessMult);
  const resolvedIconColor = multiplyHexColorBrightness(
    SharedConsts.ICON_ON_TINTED_BUTTON_COLOR,
    brightnessMult,
  );

  const buttonStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: AddBathroomConsts.ACTION_BUTTON_HEIGHT_PX,
    margin: 0,
    padding: 0,
    border: `${Viewport2dButtonConsts.OUTLINE_THICKNESS}px solid ${resolvedFillColor}`,
    borderRadius: Viewport2dButtonConsts.CORNER_RADIUS,
    backgroundColor: resolvedFillColor,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    transition: `background-color ${interactTransition}, border-color ${interactTransition}`,
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
    >
      <ActionIcon path={iconPath} iconColor={resolvedIconColor} />
    </button>
  );
}

export function ActionButtons({
  disabled = false,
  onCancel,
  onConfirm,
}: ActionButtonsProps) {
  const rowStyle: CSSProperties = {
    position: "absolute",
    left: AddBathroomConsts.ACTION_BUTTON_SIDE_MARGIN_PX,
    right: AddBathroomConsts.ACTION_BUTTON_SIDE_MARGIN_PX,
    bottom: AddBathroomConsts.ACTION_BUTTON_BOTTOM_MARGIN_PX,
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    gap: AddBathroomConsts.ACTION_BUTTON_GAP_PX,
    pointerEvents: "auto",
  };

  return (
    <div style={rowStyle}>
      <TintedActionButton
        ariaLabel="Cancel add bathroom"
        fillColor={SharedConsts.NEGATIVE_COLOR}
        disabled={disabled}
        iconPath={AddBathroomConsts.CANCEL_ICON}
        onClick={onCancel}
      />
      <TintedActionButton
        ariaLabel="Confirm add bathroom"
        fillColor={SharedConsts.POSITIVE_COLOR}
        disabled={disabled}
        iconPath={AddBathroomConsts.CONFIRM_ICON}
        onClick={onConfirm}
      />
    </div>
  );
}
