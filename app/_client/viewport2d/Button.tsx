"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { Viewport2dButton as Viewport2dButtonConsts } from "../ComponentConstants";
import {
  type ImageDescriptor,
  resolveImageMonoColor,
} from "../pure/Image";
import {
  type Viewport2dButtonHoverInteractBehavior,
  viewportButtonInteractColorsForBehavior,
  invertHexBrightness,
  multiplyHexColorBrightness,
} from "../pure/viewport2d/ButtonInteractColor";
import {
  VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX,
  VIEWPORT2D_BUTTON_TEXT_LINE_HEIGHT,
  viewport2dButtonCircularContentSizePx,
  viewportCircularButtonOuterSidePx,
} from "../pure/viewport2d/ButtonLayout";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import {
  areViewportClicksSuppressed,
  useSwipeMenuBlocksViewport,
} from "../swipeup/SwipeMenuInteraction";
import { TextWeight, lerp } from "../Utils";
import { useAnimatedLinear01 } from "../useAnimatedLinear01";
import { useButtonSvgInteractSrc } from "./useButtonSvgInteractSrc";

export type ButtonProps = {
  cornerRadius?: number;
  fillColor?: string;
  outlineColor?: string;
  outlineThickness?: number;
  textColor?: string;
  text?: string | null;
  textWeight?: TextWeight;
  x: number;
  y: number;
  /**
   * When not `null`, passed directly to CSS `width`, overriding the computed rectangular width.
   */
  widthOverride?: string | null;
  zIndex?: number;
  /** Image resource descriptor, or `null` for no image. */
  image?: ImageDescriptor | null;
  /** When both text and image are set, places the image on the left (`true`) or right (`false`). */
  imageLeftOfText?: boolean;
  /** Space between image and text when both are present (CSS px). */
  imageTextGap?: number;
  /** Icon square size when `image` is set (CSS px). */
  imageSize?: number;
  /**
   * Renders as a circular control. Radius/extent is sized from the max of image and text
   * height plus padding; overflowing content is masked.
   */
  circular?: boolean;
  /** Internal padding from the border on every side (CSS px). */
  padding?: number;
  /** Hover / press visual feedback mode (see viewport2d_button.md). */
  hoverInteractBehavior?: Viewport2dButtonHoverInteractBehavior;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

function ButtonImage({
  imageSize,
  interactProgress,
  hoverInteractBehavior,
  darkenFactor,
  normalSrc,
  invertedSrc,
  isSvg,
  monoColor,
}: {
  imageSize: number;
  interactProgress: number;
  hoverInteractBehavior: Viewport2dButtonHoverInteractBehavior;
  darkenFactor: number;
  normalSrc: string | undefined;
  invertedSrc: string | undefined;
  isSvg: boolean;
  monoColor: string | null;
}) {
  const usesInvertInteract = hoverInteractBehavior === "invert";
  const darkenedMonoColor = useMemo(
    () =>
      monoColor != null
        ? multiplyHexColorBrightness(monoColor, darkenFactor)
        : undefined,
    [darkenFactor, monoColor],
  );
  const invertedImageColor = useMemo(
    () => (monoColor != null ? invertHexBrightness(monoColor) : undefined),
    [monoColor],
  );
  const normalIconFilter = useMemo(
    () => (monoColor != null ? blackMonoIconCssFilter(monoColor) : undefined),
    [monoColor],
  );
  const invertedIconFilter = useMemo(
    () =>
      invertedImageColor != null
        ? blackMonoIconCssFilter(invertedImageColor)
        : undefined,
    [invertedImageColor],
  );
  const darkenedIconFilter = useMemo(
    () =>
      darkenedMonoColor != null
        ? blackMonoIconCssFilter(darkenedMonoColor)
        : undefined,
    [darkenedMonoColor],
  );

  const imageStyle: CSSProperties = {
    height: imageSize,
    width: imageSize,
    display: "block",
    flexShrink: 0,
    objectFit: "contain",
  };

  const normalOpacity = 1 - interactProgress;
  const alternateOpacity = interactProgress;
  const darkenBrightness = lerp(1, darkenFactor, interactProgress);

  if (
    !usesInvertInteract &&
    isSvg &&
    monoColor != null &&
    normalSrc != null &&
    normalIconFilter != null &&
    darkenedIconFilter != null
  ) {
    return (
      <div
        style={{
          position: "relative",
          width: imageSize,
          height: imageSize,
          flexShrink: 0,
        }}
      >
        <img
          src={normalSrc}
          alt=""
          draggable={false}
          style={{
            ...imageStyle,
            position: "absolute",
            inset: 0,
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
            position: "absolute",
            inset: 0,
            filter: darkenedIconFilter,
            opacity: alternateOpacity,
          }}
        />
      </div>
    );
  }

  if (
    usesInvertInteract &&
    isSvg &&
    monoColor != null &&
    normalSrc != null &&
    normalIconFilter != null &&
    invertedIconFilter != null
  ) {
    return (
      <div
        style={{
          position: "relative",
          width: imageSize,
          height: imageSize,
          flexShrink: 0,
        }}
      >
        <img
          src={normalSrc}
          alt=""
          draggable={false}
          style={{
            ...imageStyle,
            position: "absolute",
            inset: 0,
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
            position: "absolute",
            inset: 0,
            filter: invertedIconFilter,
            opacity: alternateOpacity,
          }}
        />
      </div>
    );
  }

  if (usesInvertInteract && isSvg && invertedSrc != null && normalSrc != null) {
    return (
      <div
        style={{
          position: "relative",
          width: imageSize,
          height: imageSize,
          flexShrink: 0,
        }}
      >
        <img
          src={normalSrc}
          alt=""
          draggable={false}
          style={{
            ...imageStyle,
            position: "absolute",
            inset: 0,
            opacity: normalOpacity,
          }}
        />
        <img
          src={invertedSrc}
          alt=""
          draggable={false}
          style={{
            ...imageStyle,
            position: "absolute",
            inset: 0,
            opacity: alternateOpacity,
          }}
        />
      </div>
    );
  }

  if (!usesInvertInteract && normalSrc != null) {
    return (
      <img
        src={normalSrc}
        alt=""
        draggable={false}
        style={{
          ...imageStyle,
          filter: `brightness(${darkenBrightness})`,
        }}
      />
    );
  }

  return (
    <img
      src={normalSrc}
      alt=""
      draggable={false}
      style={imageStyle}
    />
  );
}

export function Button({
  cornerRadius = Viewport2dButtonConsts.CORNER_RADIUS,
  fillColor = Viewport2dButtonConsts.FILL_COLOR,
  outlineColor = Viewport2dButtonConsts.OUTLINE_COLOR,
  outlineThickness = Viewport2dButtonConsts.OUTLINE_THICKNESS,
  textColor = Viewport2dButtonConsts.TEXT_COLOR,
  textWeight = Viewport2dButtonConsts.TEXT_WEIGHT,
  text = Viewport2dButtonConsts.TEXT,
  widthOverride = Viewport2dButtonConsts.WIDTH_OVERRIDE,
  x,
  y,
  zIndex = Viewport2dButtonConsts.Z_INDEX,
  image = Viewport2dButtonConsts.IMAGE,
  imageLeftOfText = Viewport2dButtonConsts.IMAGE_LEFT_OF_TEXT,
  imageTextGap = Viewport2dButtonConsts.IMAGE_TEXT_GAP,
  imageSize = Viewport2dButtonConsts.IMAGE_SIZE,
  circular = Viewport2dButtonConsts.CIRCULAR,
  padding = Viewport2dButtonConsts.PADDING,
  hoverInteractBehavior = Viewport2dButtonConsts.HOVER_INTERACT_BEHAVIOR,
  onClick,
}: ButtonProps) {
  const viewportPointerBlocked = useSwipeMenuBlocksViewport();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    Viewport2dButtonConsts.ANIMATION_DURATION_MS,
  );

  const {
    fillColor: resolvedFillColor,
    outlineColor: resolvedOutlineColor,
    textColor: resolvedTextColor,
  } = viewportButtonInteractColorsForBehavior(
    fillColor,
    outlineColor,
    textColor,
    interactProgress,
    hoverInteractBehavior,
    Viewport2dButtonConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR,
  );

  const imagePath = image?.path;
  const monoColor = resolveImageMonoColor(image);
  const isMonoColor = monoColor != null;

  const { isSvg, normalSrc, invertedSrc } = useButtonSvgInteractSrc(
    imagePath,
    !isMonoColor,
    isMonoColor,
  );

  const hasText = text != null && text.length > 0;
  const hasImage = imagePath != null && imagePath.length > 0;
  const useCircularLayout = circular && (hasImage || hasText);

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: hasText && hasImage ? imageTextGap : 0,
    flexDirection: "row",
  };

  const imageEl = hasImage ? (
    <ButtonImage
      imageSize={imageSize}
      interactProgress={interactProgress}
      hoverInteractBehavior={hoverInteractBehavior}
      darkenFactor={Viewport2dButtonConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR}
      normalSrc={normalSrc}
      invertedSrc={invertedSrc}
      isSvg={isSvg}
      monoColor={monoColor}
    />
  ) : null;

  const textEl = hasText ? (
    <span
      className={textWeight}
      style={{
        color: resolvedTextColor,
        fontSize: VIEWPORT2D_BUTTON_TEXT_FONT_SIZE_PX,
        lineHeight: VIEWPORT2D_BUTTON_TEXT_LINE_HEIGHT,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  ) : null;

  let inner: ReactNode;
  if (hasImage && hasText) {
    inner = (
      <div style={rowStyle}>
        {imageLeftOfText ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imageEl}
          </>
        )}
      </div>
    );
  } else if (hasImage) {
    inner = <div style={rowStyle}>{imageEl}</div>;
  } else if (hasText) {
    inner = <div style={rowStyle}>{textEl}</div>;
  } else {
    inner = null;
  }

  const circularContentSizePx = viewport2dButtonCircularContentSizePx(
    hasImage,
    imageSize,
    hasText,
  );
  const outerSidePx = useCircularLayout
    ? viewportCircularButtonOuterSidePx(
        circularContentSizePx,
        padding,
        outlineThickness,
      )
    : undefined;

  const baseStyle: CSSProperties = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    zIndex,
    margin: 0,
    backgroundColor: resolvedFillColor,
    borderWidth: `${outlineThickness}px`,
    borderStyle: "solid",
    borderColor: resolvedOutlineColor,
    cursor: "pointer",
    boxSizing: "border-box",
  };

  const layoutStyle: CSSProperties = useCircularLayout
    ? {
        ...baseStyle,
        width: `${outerSidePx}px`,
        height: `${outerSidePx}px`,
        padding: `${padding}px`,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        ...baseStyle,
        padding: `${padding}px`,
        borderRadius: `${cornerRadius}px`,
        overflow: "hidden",
        ...(widthOverride != null ? { width: widthOverride } : {}),
      };

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (viewportPointerBlocked || areViewportClicksSuppressed()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type="button"
      className={viewportPointerBlocked ? "pointer-events-none" : "pointer-events-auto"}
      disabled={viewportPointerBlocked}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      style={layoutStyle}
    >
      {inner}
    </button>
  );
}
