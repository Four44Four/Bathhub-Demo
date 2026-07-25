"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import {
  BathroomPage as BathroomPageConsts,
  DropdownMenu as DropdownMenuConsts,
  Viewport2dButton as Viewport2dButtonConsts,
} from "../ComponentConstants";
import {
  bathroomExistenceVoteBarAgainstLabelColor,
  bathroomExistenceVoteBarForLabelColor,
  bathroomExistenceVoteForRatio,
  bathroomExistenceVoteStubCounts,
  bathroomInformationPanelArrowRotationDeg,
  bathroomInformationPanelArrowRowHeightPx,
  bathroomInformationPanelBodyClipHeightPx,
  bathroomInformationPanelExpandedContentShadowInset,
  bathroomInformationPanelExpandedContentOpacity,
  bathroomInformationPanelIconColor,
  bathroomInformationPanelIconPath,
  bathroomInformationPanelIconShouldHighlight,
  type BathroomExistenceVoteCounts,
} from "../pure/bathroom/BathroomInformation";
import { dropshadowToBoxShadowCss } from "../pure/Dropshadow";
import {
  blackMonoIconCssFilter,
  blackMonoIconCssFilterWithBrightness,
} from "../pure/svg/BlackMonoIconCssFilter";
import {
  multiplyHexColorBrightness,
  viewportButtonInteractColorsForBehavior,
} from "../pure/viewport2d/ButtonInteractColor";
import type { VerifyStatus } from "../../_shared/BathroomDataPrimary";
import { TextWeight } from "../Utils";
import { useAnimatedLinear01 } from "../useAnimatedLinear01";

type BathroomInformationPanelProps = {
  verifyStatus: VerifyStatus;
  widthPx: number;
  voteCounts?: BathroomExistenceVoteCounts;
};

function ExistenceVoteBar({
  forCount,
  againstCount,
  panelWidthPx,
}: {
  forCount: number;
  againstCount: number;
  panelWidthPx: number;
}) {
  const forRatio = bathroomExistenceVoteForRatio(forCount, againstCount);
  const barWidthPx =
    panelWidthPx * BathroomPageConsts.BATHROOM_INFORMATION_PANEL_EXISTENCE_VOTE_BAR_WIDTH_RATIO;
  const barHeightPx = BathroomPageConsts.RATING_BAR_HEIGHT_PX;

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: BathroomPageConsts.COMPONENTS_GAP_PX,
    width: "100%",
  };

  const labelBaseStyle: CSSProperties = {
    fontSize: 14,
    lineHeight: 1.2,
    flexShrink: 0,
  };

  const forLabelStyle: CSSProperties = {
    ...labelBaseStyle,
    color: bathroomExistenceVoteBarForLabelColor(),
  };

  const againstLabelStyle: CSSProperties = {
    ...labelBaseStyle,
    color: bathroomExistenceVoteBarAgainstLabelColor(),
  };

  const barStyle: CSSProperties = {
    width: barWidthPx,
    height: barHeightPx,
    display: "flex",
    flexShrink: 0,
    borderRadius: barHeightPx / 2,
    overflow: "hidden",
  };

  const forStyle: CSSProperties = {
    width: `${forRatio * 100}%`,
    height: "100%",
    backgroundColor: BathroomPageConsts.VERIFIED_COLOR,
  };

  const againstStyle: CSSProperties = {
    flex: 1,
    height: "100%",
    backgroundColor: BathroomPageConsts.NON_VERIFIED_COLOR,
  };

  return (
    <div style={rowStyle}>
      <span className={TextWeight.BOLD} style={forLabelStyle}>
        {forCount}
      </span>
      <div style={barStyle}>
        <div style={forStyle} />
        <div style={againstStyle} />
      </div>
      <span className={TextWeight.BOLD} style={againstLabelStyle}>
        {againstCount}
      </span>
    </div>
  );
}

function ExistenceVoteButton({
  label,
  fillColor,
  onClick,
  onHighlightChange,
  onPointerHoverSync,
}: {
  label: string;
  fillColor: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onHighlightChange: (highlighted: boolean) => void;
  onPointerHoverSync: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = isHovered || isPressed;

  useEffect(() => {
    onHighlightChange(isHighlighted);
    return () => onHighlightChange(false);
  }, [isHighlighted, onHighlightChange]);

  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    Viewport2dButtonConsts.ANIMATION_DURATION_MS,
  );

  const textColor = multiplyHexColorBrightness(
    fillColor,
    BathroomPageConsts.BATHROOM_EXISTENCE_VOTE_BUTTON_TEXT_COLOR_BRIGHTNESS_MULT_FACTOR,
  );

  const { fillColor: resolvedFillColor, textColor: resolvedTextColor } =
    viewportButtonInteractColorsForBehavior(
      fillColor,
      Viewport2dButtonConsts.OUTLINE_COLOR,
      textColor,
      interactProgress,
      "darken",
      Viewport2dButtonConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR,
    );

  const buttonStyle: CSSProperties = {
    flex: 1,
    margin: 0,
    padding: `${DropdownMenuConsts.PADDING_PIXEL_SIZE}px`,
    borderRadius: Viewport2dButtonConsts.CORNER_RADIUS,
    border: "none",
    backgroundColor: resolvedFillColor,
    color: resolvedTextColor,
    cursor: "pointer",
    boxShadow: dropshadowToBoxShadowCss(BathroomPageConsts.DROP_SHADOW),
    fontSize: 14,
    lineHeight: 1.2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 14 * 1.2 + DropdownMenuConsts.PADDING_PIXEL_SIZE * 2,
    boxSizing: "border-box",
  };

  return (
    <button
      type="button"
      className={TextWeight.BOLD}
      style={buttonStyle}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      onMouseEnter={(event) => {
        event.stopPropagation();
        setIsHovered(true);
      }}
      onMouseLeave={(event) => {
        event.stopPropagation();
        setIsHovered(false);
        setIsPressed(false);
        onPointerHoverSync();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        setIsPressed(true);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        setIsPressed(false);
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        setIsPressed(false);
      }}
    >
      {label}
    </button>
  );
}

/** Bathroom information panel (see specifications/swipe_up_menu/bathroom_page.md). */
export function BathroomInformationPanel({
  verifyStatus,
  widthPx,
  voteCounts = bathroomExistenceVoteStubCounts(),
}: BathroomInformationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [expandedContentHeightPx, setExpandedContentHeightPx] = useState(0);
  const [highlightedVoteButtonCount, setHighlightedVoteButtonCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const expandedMeasureRef = useRef<HTMLDivElement>(null);
  const voteButtonHighlightCountsRef = useRef(new Map<string, boolean>());

  const syncPanelPointerHoverFromDom = useCallback(() => {
    const panel = panelRef.current;
    if (panel == null) {
      return;
    }
    const hovered = panel.matches(":hover");
    setIsHovered(hovered);
    if (!hovered) {
      setIsPressed(false);
    }
  }, []);

  const scheduleSyncPanelPointerHoverFromDom = useCallback(() => {
    requestAnimationFrame(syncPanelPointerHoverFromDom);
  }, [syncPanelPointerHoverFromDom]);

  const measureExpandedContent = useCallback(() => {
    const node = expandedMeasureRef.current;
    if (node == null) {
      return;
    }
    setExpandedContentHeightPx(node.offsetHeight);
  }, []);

  const setVoteButtonHighlighted = useCallback(
    (buttonId: string, highlighted: boolean) => {
      const counts = voteButtonHighlightCountsRef.current;
      if (highlighted) {
        counts.set(buttonId, true);
      } else {
        counts.delete(buttonId);
      }
      setHighlightedVoteButtonCount(counts.size);
    },
    [],
  );

  const isHighlighted = bathroomInformationPanelIconShouldHighlight(
    isHovered || isPressed,
    highlightedVoteButtonCount > 0,
  );
  const hoverProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    BathroomPageConsts.BATHROOM_INFORMATION_PANEL_HOVER_ANIMATION_DURATION_MS,
  );
  const expandedProgress = useAnimatedLinear01(
    isExpanded ? 1 : 0,
    BathroomPageConsts.BATHROOM_INFORMATION_PANEL_EXPAND_ANIMATION_DURATION_MS,
  );
  const contentFadeProgress = useAnimatedLinear01(
    isExpanded ? 1 : 0,
    BathroomPageConsts.BATHROOM_INFORMATION_PANEL_HOVER_ANIMATION_DURATION_MS,
  );

  useLayoutEffect(() => {
    measureExpandedContent();
  }, [measureExpandedContent, voteCounts.forCount, voteCounts.againstCount, widthPx]);

  useEffect(() => {
    const node = expandedMeasureRef.current;
    if (node == null || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      measureExpandedContent();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureExpandedContent]);

  useEffect(() => {
    if (!isHovered) {
      return;
    }
    const panel = panelRef.current;
    if (panel == null) {
      return;
    }
    const handlePointerMove = () => {
      if (!panel.matches(":hover")) {
        syncPanelPointerHoverFromDom();
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [isHovered, syncPanelPointerHoverFromDom]);

  useEffect(() => {
    if (!isPressed) {
      return;
    }
    const handlePointerUp = () => {
      setIsPressed(false);
    };
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isPressed]);

  const iconColor = bathroomInformationPanelIconColor(verifyStatus);
  const iconPath = bathroomInformationPanelIconPath(verifyStatus);
  const iconBrightness =
    1 -
    hoverProgress *
      (1 -
        BathroomPageConsts.BATHROOM_INFORMATION_PANEL_HOVER_INTERACT_DARKENING_MULT_FACTOR);
  const bodySlotHeightPx = bathroomInformationPanelBodyClipHeightPx(
    expandedProgress,
    expandedContentHeightPx,
  );
  const arrowRotationDeg =
    bathroomInformationPanelArrowRotationDeg(expandedProgress);
  const arrowRowHeightPx = bathroomInformationPanelArrowRowHeightPx();
  const arrowFilter = useMemo(
    () => blackMonoIconCssFilter(BathroomPageConsts.TEXT_COLOR),
    [],
  );
  const expandedContentOpacity =
    bathroomInformationPanelExpandedContentOpacity(contentFadeProgress);
  const panelPaddingPx = BathroomPageConsts.BATHROOM_INFORMATION_PANEL_PADDING_PX;
  const expandedContentShadowInset =
    bathroomInformationPanelExpandedContentShadowInset(panelPaddingPx);

  const panelStyle: CSSProperties = {
    position: "relative",
    width: widthPx,
    borderRadius: BathroomPageConsts.BATHROOM_INFORMATION_PANEL_CORNER_RADIUS_PX,
    backgroundColor: BathroomPageConsts.BATHROOM_INFORMATION_PANEL_BACKGROUND_FILL_COLOR,
    boxShadow: dropshadowToBoxShadowCss(BathroomPageConsts.DROP_SHADOW),
    boxSizing: "border-box",
    cursor: "pointer",
    overflow: "hidden",
    textAlign: "center",
    padding: 0,
  };

  const panelContentStyle: CSSProperties = {
    padding: `${panelPaddingPx}px ${panelPaddingPx}px 0`,
    overflow: "visible",
  };

  const iconStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "auto",
    filter: blackMonoIconCssFilterWithBrightness(iconColor, iconBrightness),
  };

  const bodyClipStyle: CSSProperties = {
    height: bodySlotHeightPx,
    overflow: "hidden",
    // Bleed into panel side padding so overflow:hidden does not clip button
    // drop shadows that should paint in that padding region.
    marginLeft: expandedContentShadowInset.bodyClipMarginLeftPx,
    marginRight: expandedContentShadowInset.bodyClipMarginRightPx,
  };

  const expandedContentLayoutStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: BathroomPageConsts.COMPONENTS_GAP_PX,
  };

  const expandedInnerStyle: CSSProperties = {
    ...expandedContentLayoutStyle,
    opacity: expandedContentOpacity,
    paddingBottom: expandedContentShadowInset.paddingBottomPx,
    paddingLeft: expandedContentShadowInset.paddingLeftPx,
    paddingRight: expandedContentShadowInset.paddingRightPx,
  };

  const buttonRowStyle: CSSProperties = {
    display: "flex",
    gap: BathroomPageConsts.COMPONENTS_GAP_PX,
  };

  const arrowRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: arrowRowHeightPx,
    flexShrink: 0,
    lineHeight: 0,
  };

  const arrowIconStyle: CSSProperties = {
    display: "block",
    width: BathroomPageConsts.BATHROOM_INFORMATION_PANEL_ARROW_ICON_SIZE_PX,
    height: BathroomPageConsts.BATHROOM_INFORMATION_PANEL_ARROW_ICON_SIZE_PX,
    flexShrink: 0,
    objectFit: "contain",
    objectPosition: "center",
    filter: arrowFilter,
    transform: `rotate(${arrowRotationDeg}deg)`,
    transformOrigin: "center center",
  };

  const noopVoteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const realVoteHighlightChange = useCallback(
    (highlighted: boolean) => setVoteButtonHighlighted("real", highlighted),
    [setVoteButtonHighlighted],
  );
  const goneVoteHighlightChange = useCallback(
    (highlighted: boolean) => setVoteButtonHighlighted("gone", highlighted),
    [setVoteButtonHighlighted],
  );

  const expandedContent = (
    <>
      <ExistenceVoteBar
        forCount={voteCounts.forCount}
        againstCount={voteCounts.againstCount}
        panelWidthPx={widthPx}
      />
      <div style={buttonRowStyle}>
        <ExistenceVoteButton
          label="Real?"
          fillColor={BathroomPageConsts.VERIFIED_COLOR}
          onClick={noopVoteClick}
          onHighlightChange={realVoteHighlightChange}
          onPointerHoverSync={scheduleSyncPanelPointerHoverFromDom}
        />
        <ExistenceVoteButton
          label="Gone?"
          fillColor={BathroomPageConsts.NON_VERIFIED_COLOR}
          onClick={noopVoteClick}
          onHighlightChange={goneVoteHighlightChange}
          onPointerHoverSync={scheduleSyncPanelPointerHoverFromDom}
        />
      </div>
    </>
  );

  return (
    <div
      ref={panelRef}
      role="button"
      tabIndex={0}
      style={panelStyle}
      onClick={() => {
        setIsExpanded((current) => !current);
        requestAnimationFrame(measureExpandedContent);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsExpanded((current) => !current);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={scheduleSyncPanelPointerHoverFromDom}
      onPointerLeave={(event) => {
        const relatedTarget = event.relatedTarget;
        const stillInside =
          relatedTarget instanceof Node &&
          event.currentTarget.contains(relatedTarget);
        if (!stillInside) {
          scheduleSyncPanelPointerHoverFromDom();
        }
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
    >
      <div style={panelContentStyle}>
        <img
          src={iconPath}
          alt=""
          aria-hidden
          style={iconStyle}
        />
        <div
          aria-hidden
          style={{
            height: BathroomPageConsts.BATHROOM_INFORMATION_PANEL_ICON_BUFFER_PX,
          }}
        />
        <div style={bodyClipStyle}>
          {contentFadeProgress > 0 ? (
            <div style={expandedInnerStyle}>{expandedContent}</div>
          ) : null}
        </div>
      </div>
      <div style={arrowRowStyle}>
        <img
          src={DropdownMenuConsts.ARROW_ICON_PATH}
          alt=""
          aria-hidden
          draggable={false}
          style={arrowIconStyle}
        />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          width: widthPx,
          left: 0,
          top: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <div ref={expandedMeasureRef} style={expandedContentLayoutStyle}>
          {expandedContent}
        </div>
      </div>
    </div>
  );
}
