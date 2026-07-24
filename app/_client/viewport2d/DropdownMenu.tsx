"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { DropdownMenu as DropdownMenuConsts } from "../ComponentConstants";
import { dropshadowToBoxShadowCss, type DropshadowDescriptor } from "../pure/Dropshadow";
import {
  dropdownMenuArrowRotationDeg,
  dropdownMenuPanelHeightPx,
} from "../pure/dropdown-menu/DropdownMenuLayout";
import {
  type TextDescriptor,
  resolveTextColor,
  resolveTextContent,
  resolveTextFontSizePx,
  resolveTextWeight,
} from "../pure/Text";
import {
  type Viewport2dButtonHoverInteractBehavior,
  viewportButtonInteractColorsForBehavior,
  viewportButtonInteractContentCssFilter,
} from "../pure/viewport2d/ButtonInteractColor";
import { viewport2dButtonZIndex } from "../pure/viewport2d/Viewport2dButtonZIndex";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../pure/viewport2d/PositionalAlertAnchor";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import { useAnimatedLinear01 } from "../useAnimatedLinear01";

export type DropdownMenuProps = {
  x: number;
  y: number;
  initialDisplayContent: TextDescriptor | ReactNode;
  arrowIconColor?: string;
  fillColor?: string;
  cornerRadius?: number;
  outlineColor?: string;
  outlineThickness?: number;
  widthOverride?: string | null;
  dropShadow?: DropshadowDescriptor | null;
  hoverInteractBehavior?: Viewport2dButtonHoverInteractBehavior;
  anchorElement?: HTMLElement | null;
  subcomponents?: ReactNode[] | null;
};

function isTextDescriptor(
  value: TextDescriptor | ReactNode,
): value is TextDescriptor {
  return (
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "content" in value &&
    "color" in value
  );
}

export function DropdownMenu({
  x,
  y,
  initialDisplayContent,
  arrowIconColor = DropdownMenuConsts.ARROW_ICON_COLOR,
  fillColor = DropdownMenuConsts.FILL_COLOR,
  cornerRadius = DropdownMenuConsts.CORNER_RADIUS,
  outlineColor = DropdownMenuConsts.OUTLINE_COLOR,
  outlineThickness = DropdownMenuConsts.OUTLINE_THICKNESS,
  widthOverride = DropdownMenuConsts.WIDTH_OVERRIDE,
  dropShadow = DropdownMenuConsts.DROP_SHADOW,
  hoverInteractBehavior = DropdownMenuConsts.HOVER_INTERACT_BEHAVIOR,
  anchorElement = DropdownMenuConsts.ANCHOR_ELEMENT,
  subcomponents = DropdownMenuConsts.SUBCOMPONENTS_LIST,
}: DropdownMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [panelFullHeightPx, setPanelFullHeightPx] = useState(0);
  const panelMeasureRef = useRef<HTMLDivElement>(null);

  const expandedProgress = useAnimatedLinear01(
    isExpanded ? 1 : 0,
    DropdownMenuConsts.ANIMATION_DURATION_MS,
  );
  const isHighlighted = isHovered || isPressed;
  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    DropdownMenuConsts.ANIMATION_DURATION_MS,
  );

  const resolvedZIndex = useMemo(
    () =>
      typeof window !== "undefined"
        ? viewport2dButtonZIndex(anchorElement ?? null, (element) =>
            window.getComputedStyle(element),
          )
        : VIEWPORT2D_TOP_LAYER_Z_INDEX,
    [anchorElement],
  );

  const resolvedBoxShadow = useMemo(
    () => (dropShadow != null ? dropshadowToBoxShadowCss(dropShadow) : undefined),
    [dropShadow],
  );

  const labelTextColor = isTextDescriptor(initialDisplayContent)
    ? (resolveTextColor(initialDisplayContent) ?? outlineColor)
    : outlineColor;

  const {
    fillColor: resolvedToggleFillColor,
    textColor: resolvedTextColor,
  } = viewportButtonInteractColorsForBehavior(
    fillColor,
    outlineColor,
    labelTextColor,
    interactProgress,
    hoverInteractBehavior,
    DropdownMenuConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR,
  );

  const { textColor: resolvedArrowColor } = viewportButtonInteractColorsForBehavior(
    arrowIconColor,
    arrowIconColor,
    arrowIconColor,
    interactProgress,
    hoverInteractBehavior,
    DropdownMenuConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR,
  );

  const arrowFilter = useMemo(
    () => blackMonoIconCssFilter(resolvedArrowColor),
    [resolvedArrowColor],
  );

  const displayContentCssFilter = useMemo(
    () =>
      viewportButtonInteractContentCssFilter(
        interactProgress,
        hoverInteractBehavior,
        DropdownMenuConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR,
      ),
    [hoverInteractBehavior, interactProgress],
  );

  const displayContentNormalOpacity = 1 - interactProgress;
  const displayContentInvertedOpacity = interactProgress;
  const usesInvertDisplayContent =
    hoverInteractBehavior === "invert" && interactProgress > 0;

  const measurePanel = useCallback(() => {
    const node = panelMeasureRef.current;
    if (node == null) {
      return;
    }
    setPanelFullHeightPx(node.offsetHeight);
  }, []);

  useLayoutEffect(() => {
    measurePanel();
  }, [measurePanel, subcomponents, widthOverride]);

  useEffect(() => {
    const node = panelMeasureRef.current;
    if (node == null || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      measurePanel();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [measurePanel]);

  const toggleLabel = isTextDescriptor(initialDisplayContent) ? (
    <span
      className={resolveTextWeight(initialDisplayContent)}
      style={{
        color: resolvedTextColor,
        fontSize: resolveTextFontSizePx(initialDisplayContent),
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: 0,
        flex: 1,
      }}
    >
      {resolveTextContent(initialDisplayContent)}
    </span>
  ) : (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        flex: 1,
        overflow: "hidden",
        ...(displayContentCssFilter != null ? { filter: displayContentCssFilter } : {}),
      }}
    >
      {usesInvertDisplayContent ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              width: "100%",
              opacity: displayContentNormalOpacity,
            }}
          >
            {initialDisplayContent}
          </div>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              filter: "invert(1)",
              opacity: displayContentInvertedOpacity,
              pointerEvents: "none",
            }}
          >
            {initialDisplayContent}
          </div>
        </>
      ) : (
        initialDisplayContent
      )}
    </div>
  );

  const panelHeightPx = dropdownMenuPanelHeightPx(
    expandedProgress,
    panelFullHeightPx,
  );
  const arrowRotationDeg = dropdownMenuArrowRotationDeg(expandedProgress);

  const panelInnerStyle: CSSProperties = {
    padding: DropdownMenuConsts.PADDING_PIXEL_SIZE,
    display: "flex",
    flexDirection: "column",
    gap: DropdownMenuConsts.PADDING_PIXEL_SIZE,
  };

  const subcomponentNodes =
    subcomponents?.map((child, index) => <div key={index}>{child}</div>) ?? null;

  const rootStyle: CSSProperties = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    zIndex: resolvedZIndex,
    width: widthOverride ?? "auto",
    ...(resolvedBoxShadow != null ? { boxShadow: resolvedBoxShadow } : {}),
    borderRadius: `${cornerRadius}px`,
    overflow: "hidden",
    border: `${outlineThickness}px solid ${outlineColor}`,
    backgroundColor: "transparent",
    boxSizing: "border-box",
  };

  const toggleStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: DropdownMenuConsts.PADDING_PIXEL_SIZE,
    width: "100%",
    margin: 0,
    cursor: "pointer",
    border: "none",
    backgroundColor: resolvedToggleFillColor,
    boxSizing: "border-box",
  };

  const panelStyle: CSSProperties = {
    height: `${panelHeightPx}px`,
    overflow: "hidden",
    boxSizing: "border-box",
    backgroundColor: fillColor,
  };

  const menuEl = (
    <div style={rootStyle}>
      <button
        type="button"
        style={toggleStyle}
        onClick={() => {
          setIsExpanded((prev) => !prev);
          requestAnimationFrame(measurePanel);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
      >
        {toggleLabel}
        <img
          src={DropdownMenuConsts.ARROW_ICON_PATH}
          alt=""
          draggable={false}
          style={{
            width: DropdownMenuConsts.ARROW_ICON_PIXEL_SIZE,
            height: DropdownMenuConsts.ARROW_ICON_PIXEL_SIZE,
            flexShrink: 0,
            filter: arrowFilter,
            transform: `rotate(${arrowRotationDeg}deg)`,
          }}
        />
      </button>
      <div style={panelStyle} aria-hidden={panelHeightPx <= 0}>
        <div style={panelInnerStyle}>{subcomponentNodes}</div>
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          width: widthOverride ?? "auto",
          left: 0,
          top: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <div ref={panelMeasureRef} style={panelInnerStyle}>
          {subcomponentNodes}
        </div>
      </div>
    </div>
  );

  if (anchorElement != null) {
    return createPortal(menuEl, anchorElement);
  }

  return menuEl;
}
