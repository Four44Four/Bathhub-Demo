"use client";

import { useMemo, useState, type CSSProperties, type MouseEventHandler } from "react";

import {
  CircularCloseButton as CircularCloseButtonConsts,
  Shared as SharedConsts,
  Viewport2dButton as Viewport2dButtonConsts,
} from "./ComponentConstants";
import { resolveImageMonoColor } from "./pure/Image";
import { blackMonoIconCssFilter } from "./pure/svg/BlackMonoIconCssFilter";
import {
  multiplyHexColorBrightness,
  viewportButtonInteractColorsForBehavior,
} from "./pure/viewport2d/ButtonInteractColor";
import { useAnimatedLinear01 } from "./useAnimatedLinear01";
import { useButtonSvgInteractSrc } from "./viewport2d/useButtonSvgInteractSrc";

export type CircularCloseButtonProps = {
  ariaLabel: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

type CircularCloseIconProps = {
  imageSizePx: number;
  interactProgress: number;
  darkenFactor: number;
  normalSrc: string | undefined;
  monoColor: string;
};

function CircularCloseIcon({
  imageSizePx,
  interactProgress,
  darkenFactor,
  normalSrc,
  monoColor,
}: CircularCloseIconProps) {
  const normalIconFilter = useMemo(
    () => blackMonoIconCssFilter(monoColor),
    [monoColor],
  );
  const darkenedMonoColor = useMemo(
    () => multiplyHexColorBrightness(monoColor, darkenFactor),
    [darkenFactor, monoColor],
  );
  const darkenedIconFilter = useMemo(
    () => blackMonoIconCssFilter(darkenedMonoColor),
    [darkenedMonoColor],
  );

  const imageStyle: CSSProperties = {
    height: imageSizePx,
    width: imageSizePx,
    display: "block",
    objectFit: "contain",
    position: "absolute",
    inset: 0,
  };

  if (normalSrc == null) {
    return null;
  }

  const normalOpacity = 1 - interactProgress;
  const darkenedOpacity = interactProgress;

  return (
    <div
      style={{
        position: "relative",
        width: imageSizePx,
        height: imageSizePx,
        flexShrink: 0,
      }}
    >
      <img
        src={normalSrc}
        alt=""
        draggable={false}
        style={{
          ...imageStyle,
          filter: normalIconFilter,
          opacity: normalOpacity,
        }}
      />
      <img
        src={normalSrc}
        alt=""
        draggable={false}
        style={{
          ...imageStyle,
          filter: darkenedIconFilter,
          opacity: darkenedOpacity,
        }}
      />
    </div>
  );
}

export function CircularCloseButton({
  ariaLabel,
  onClick,
}: CircularCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    Viewport2dButtonConsts.ANIMATION_DURATION_MS,
  );

  const darkenFactor = Viewport2dButtonConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR;
  const { fillColor: resolvedFillColor } = viewportButtonInteractColorsForBehavior(
    CircularCloseButtonConsts.FILL,
    CircularCloseButtonConsts.FILL,
    SharedConsts.ICON_ON_TINTED_BUTTON_COLOR,
    interactProgress,
    "darken",
    darkenFactor,
  );

  const monoColor = resolveImageMonoColor(CircularCloseButtonConsts.IMAGE);
  const { normalSrc } = useButtonSvgInteractSrc(
    CircularCloseButtonConsts.IMAGE.path,
    false,
    true,
  );

  const sizePx = CircularCloseButtonConsts.SIZE_PX;

  const buttonStyle: CSSProperties = {
    width: sizePx,
    height: sizePx,
    borderRadius: "50%",
    border: "none",
    backgroundColor: resolvedFillColor,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: CircularCloseButtonConsts.BOX_SHADOW,
    padding: CircularCloseButtonConsts.PADDING_PX,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
    >
      {monoColor != null ? (
        <CircularCloseIcon
          imageSizePx={CircularCloseButtonConsts.IMAGE_SIZE_PX}
          interactProgress={interactProgress}
          darkenFactor={darkenFactor}
          normalSrc={normalSrc}
          monoColor={monoColor}
        />
      ) : null}
    </button>
  );
}
