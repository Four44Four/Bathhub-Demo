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
  viewportButtonBrightnessInteractColors,
  viewportButtonInteractColorsAtProgress,
  invertHexBrightness,
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
import { TextWeight } from "../Utils";
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
   * When set, applied as the button's CSS `width` (e.g. `"100%"` or a pixel value).
   * Not in viewport2d_button.md — kept for ImportantAlert layout.
   */
  width?: number | string;
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
  /**
   * When set, dims fill/outline/text via brightness multiply on hover/press instead of brightness invert.
   * Not in viewport2d_button.md — kept for ImportantAlert accent buttons.
   */
  interactBrightnessMult?: number;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

function ButtonImage({
  imageSize,
  invertProgress,
  normalSrc,
  invertedSrc,
  isSvg,
  monoColor,
}: {
  imageSize: number;
  invertProgress: number;
  normalSrc: string | undefined;
  invertedSrc: string | undefined;
  isSvg: boolean;
  monoColor: string | null;
}) {
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

  const imageStyle: CSSProperties = {
    height: imageSize,
    width: imageSize,
    display: "block",
    flexShrink: 0,
    objectFit: "contain",
  };

  const normalOpacity = 1 - invertProgress;
  const invertedOpacity = invertProgress;

  if (
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
            opacity: invertedOpacity,
          }}
        />
      </div>
    );
  }

  if (isSvg && invertedSrc != null && normalSrc != null) {
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
            opacity: invertedOpacity,
          }}
        />
      </div>
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
  x,
  y,
  width,
  zIndex = Viewport2dButtonConsts.Z_INDEX,
  image = Viewport2dButtonConsts.IMAGE,
  imageLeftOfText = Viewport2dButtonConsts.IMAGE_LEFT_OF_TEXT,
  imageTextGap = Viewport2dButtonConsts.IMAGE_TEXT_GAP,
  imageSize = Viewport2dButtonConsts.IMAGE_SIZE,
  circular = Viewport2dButtonConsts.CIRCULAR,
  padding = Viewport2dButtonConsts.PADDING,
  interactBrightnessMult,
  onClick,
}: ButtonProps) {
  const viewportPointerBlocked = useSwipeMenuBlocksViewport();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const usesBrightnessInteract = interactBrightnessMult != null;
  const invertProgress = useAnimatedLinear01(
    usesBrightnessInteract ? 0 : isHighlighted ? 1 : 0,
    Viewport2dButtonConsts.ANIMATION_DURATION_MS,
  );
  const interactTransition = `${Viewport2dButtonConsts.ANIMATION_DURATION_MS}ms linear`;

  const {
    fillColor: resolvedFillColor,
    outlineColor: resolvedOutlineColor,
    textColor: resolvedTextColor,
  } = usesBrightnessInteract
    ? viewportButtonBrightnessInteractColors(
        fillColor,
        outlineColor,
        textColor,
        isHighlighted,
        interactBrightnessMult,
      )
    : viewportButtonInteractColorsAtProgress(
        fillColor,
        outlineColor,
        textColor,
        invertProgress,
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
      invertProgress={invertProgress}
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
        ...(usesBrightnessInteract
          ? { transition: `color ${interactTransition}` }
          : {}),
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
    left: x,
    top: y,
    zIndex,
    margin: 0,
    backgroundColor: resolvedFillColor,
    borderWidth: outlineThickness,
    borderStyle: "solid",
    borderColor: resolvedOutlineColor,
    cursor: "pointer",
    boxSizing: "border-box",
    ...(usesBrightnessInteract
      ? {
          transition: `background-color ${interactTransition}, border-color ${interactTransition}, color ${interactTransition}`,
        }
      : {}),
  };

  const layoutStyle: CSSProperties = useCircularLayout
    ? {
        ...baseStyle,
        width: outerSidePx,
        height: outerSidePx,
        padding,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        ...baseStyle,
        padding,
        borderRadius: cornerRadius,
        overflow: "hidden",
        ...(width != null ? { width } : {}),
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
