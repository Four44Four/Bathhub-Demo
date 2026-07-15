"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import { BtnInteractAnim, Button as ButtonConsts } from "../ComponentConstants";
import {
  viewportButtonBrightnessInteractColors,
  viewportButtonInteractColors,
  invertHexHslValue,
} from "../pure/viewport2d/ButtonInteractColor";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import {
  areViewportClicksSuppressed,
  useSwipeMenuBlocksViewport,
} from "../swipeup/SwipeMenuInteraction";
import { TextWeight } from "../Utils";
import { useButtonSvgInteractSrc } from "./useButtonSvgInteractSrc";

export type ButtonProps = {
  cornerRadius?: number;
  fillColor?: string;
  outlineColor?: string;
  outlineThickness?: number;
  textColor?: string;
  text?: string;
  textWeight?: TextWeight;
  x: number;
  y: number;
  /** When set, applied as the button's CSS `width` (e.g. `"100%"` or a pixel value). */
  width?: number | string;
  zIndex?: number;
  imageSrc?: string;
  /** When both text and `imageSrc` are set, places the image on the left (`true`) or right (`false`) of the text. Defaults to left. */
  imageLeftOfText?: boolean;
  /** Space between image and text when both are present. Defaults to 0. */
  imageTextOffset?: number;
  /** Icon square size when `imageSrc` is set (CSS px). Defaults to 24. */
  imageSizePx?: number;
  /**
   * Renders as a circular control sized to fit the icon (image-only; ignored when `text` is set).
   * Uses symmetric `circularPaddingPx` and `borderRadius: "50%"` on a square `border-box`.
   */
  circular?: boolean;
  /** Padding on every side when `circular` is true. Defaults to 0. */
  circularPaddingPx?: number;
  /** When set, dims fill/outline/text via brightness multiply on hover/press instead of HSL invert. */
  interactBrightnessMult?: number;
  /** CSS hex tint for mono-color SVG icons (see resources.md mono-color icon policy). */
  imageColor?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

function ButtonImage({
  imageSizePx,
  isHighlighted,
  interactTransition,
  normalSrc,
  invertedSrc,
  isSvg,
  imageColor,
}: {
  imageSizePx: number;
  isHighlighted: boolean;
  interactTransition: string;
  normalSrc: string | undefined;
  invertedSrc: string | undefined;
  isSvg: boolean;
  imageColor?: string;
}) {
  const invertedImageColor = useMemo(
    () => (imageColor != null ? invertHexHslValue(imageColor) : undefined),
    [imageColor],
  );
  const normalIconFilter = useMemo(
    () => (imageColor != null ? blackMonoIconCssFilter(imageColor) : undefined),
    [imageColor],
  );
  const invertedIconFilter = useMemo(
    () =>
      invertedImageColor != null
        ? blackMonoIconCssFilter(invertedImageColor)
        : undefined,
    [invertedImageColor],
  );

  const imageStyle: CSSProperties = {
    height: imageSizePx,
    width: imageSizePx,
    display: "block",
    flexShrink: 0,
    objectFit: "contain",
  };

  if (
    isSvg &&
    imageColor != null &&
    normalSrc != null &&
    normalIconFilter != null &&
    invertedIconFilter != null
  ) {
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
            position: "absolute",
            inset: 0,
            filter: normalIconFilter,
            opacity: isHighlighted ? 0 : 1,
            transition: `opacity ${interactTransition}`,
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
            opacity: isHighlighted ? 1 : 0,
            transition: `opacity ${interactTransition}`,
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
            position: "absolute",
            inset: 0,
            opacity: isHighlighted ? 0 : 1,
            transition: `opacity ${interactTransition}`,
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
            opacity: isHighlighted ? 1 : 0,
            transition: `opacity ${interactTransition}`,
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
  cornerRadius = ButtonConsts.CORNER_RADIUS,
  fillColor = ButtonConsts.DEFAULT_FILL_COLOR,
  outlineColor = ButtonConsts.DEFAULT_LINE_COLOR,
  outlineThickness = ButtonConsts.LINE_THICKNESS,
  textColor = ButtonConsts.TEXT_COLOR,
  textWeight = TextWeight.REGULAR,
  text,
  x,
  y,
  width,
  zIndex = 0,
  imageSrc,
  imageLeftOfText = true,
  imageTextOffset = 0,
  imageSizePx = 24,
  circular = false,
  circularPaddingPx = 0,
  interactBrightnessMult,
  imageColor,
  onClick,
}: ButtonProps) {
  const viewportPointerBlocked = useSwipeMenuBlocksViewport();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;
  const interactTransition = `${BtnInteractAnim.BTN_INTERACT_DURA_MS}ms ease`;

  const {
    fillColor: resolvedFillColor,
    outlineColor: resolvedOutlineColor,
    textColor: resolvedTextColor,
  } =
    interactBrightnessMult != null
      ? viewportButtonBrightnessInteractColors(
          fillColor,
          outlineColor,
          textColor,
          isHighlighted,
          interactBrightnessMult,
        )
      : viewportButtonInteractColors(
          fillColor,
          outlineColor,
          textColor,
          isHighlighted,
        );

  const { isSvg, normalSrc, invertedSrc } = useButtonSvgInteractSrc(
    imageSrc,
    imageColor == null,
  );

  const hasText = text != null && text.length > 0;
  const hasImage = imageSrc != null && imageSrc.length > 0;
  const useCircularLayout = circular && hasImage && !hasText;

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: hasText && hasImage ? imageTextOffset : 0,
    flexDirection: "row",
  };

  const imageEl = hasImage ? (
    <ButtonImage
      imageSizePx={imageSizePx}
      isHighlighted={isHighlighted}
      interactTransition={interactTransition}
      normalSrc={normalSrc}
      invertedSrc={invertedSrc}
      isSvg={isSvg}
      imageColor={imageColor}
    />
  ) : null;

  const textEl = hasText ? (
    <span
      className={textWeight}
      style={{
        color: resolvedTextColor,
        fontSize: 14,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        transition: `color ${interactTransition}`,
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

  const outerSidePx = useCircularLayout
    ? imageSizePx + 2 * circularPaddingPx + 2 * outlineThickness
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
    transition: `background-color ${interactTransition}, border-color ${interactTransition}, color ${interactTransition}`,
  };

  const layoutStyle: CSSProperties = useCircularLayout
    ? {
        ...baseStyle,
        width: outerSidePx,
        height: outerSidePx,
        padding: circularPaddingPx,
        borderRadius: "50%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        ...baseStyle,
        padding: "10px 16px",
        borderRadius: cornerRadius,
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
