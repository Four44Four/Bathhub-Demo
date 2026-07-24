"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { incrementBathroomRating, readBathroomById } from "../Bathroom";
import {
  BathroomPage as BathroomPageConsts,
  BathroomRemoteDB,
  DropdownMenu as DropdownMenuConsts,
  SwipeMenu as SwipeMenuConsts,
  SwipeUpMainMenu as SwipeUpMainMenuConsts,
  Viewport2dButton as Viewport2dButtonConsts,
} from "../ComponentConstants";
import {
  bathroomAverageRating,
  bathroomAverageRatingLabel,
  bathroomRatingCountSpacePx,
  bathroomRatingCountsDescending,
  bathroomRatingCountsFromFullRow,
  bathroomTotalRatingCount,
  type BathroomRatingCounts,
} from "../pure/bathroom/BathroomRating";
import { bathroomInformationLabel } from "../pure/bathroom/BathroomInformation";
import {
  bathroomPageDropdownWidthPx,
  bathroomPageDropdownXPx,
} from "../pure/dropdown-menu/DropdownMenuLayout";
import {
  bathroomPageFetchFailureAlertMessage,
  promiseWithTimeout,
  resolveBathroomPageFetchResult,
} from "../pure/swipeup/BathroomPageFetchState";
import {
  bathroomPageLoadingSpinnerCenterPx,
  swipeMenuJustReopenedAboveCollapsed,
} from "../pure/swipeup/BathroomPageLayout";
import { swipeMenuIsOpenAboveCollapsed } from "../pure/swipeup/SwipeMenu";
import { useReportRateLimitViolation } from "../pure/rate-limit/useReportRateLimitViolation";
import { dropshadowToBoxShadowCss } from "../pure/Dropshadow";
import {
  viewportButtonInteractColorsForBehavior,
} from "../pure/viewport2d/ButtonInteractColor";
import { viewport2dButtonZIndex } from "../pure/viewport2d/Viewport2dButtonZIndex";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../pure/viewport2d/PositionalAlertAnchor";
import type { BathroomDataPrimaryFullRow } from "../../_shared/BathroomDataPrimary";
import { TextWeight } from "../Utils";
import { useAnimatedLinear01 } from "../useAnimatedLinear01";
import { DropdownMenu } from "../viewport2d/DropdownMenu";
import { useAlertSystem } from "../viewport2d/AlertSystem";
import { LoadingSpinner } from "../viewport2d/LoadingSpinner";
import { RatingBar } from "./RatingBar";
import { useSelectedBathroom } from "./SelectedBathroomContext";
import { useSwipeMenuContentAnchorElement } from "./SwipeMenuContentAnchor";
import { useSwipeMenuHeightPx } from "./SwipeMenuInteraction";
import { useSwipeMenuViewport } from "./SwipeMenuShell";
import { StarRatingGraphic } from "./StarRatingGraphic";

const RATING_BAR_COLORS = [
  BathroomPageConsts.STAR_RATING_5_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_4_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_3_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_2_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_1_FILL_COLOR,
] as const;

function BathroomPostButton({
  isPosting,
  disabled,
  onClick,
}: {
  isPosting: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = (isHovered || isPressed) && !isPosting;
  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    Viewport2dButtonConsts.ANIMATION_DURATION_MS,
  );

  const textColor = BathroomPageConsts.TEXT_COLOR;
  const {
    fillColor: resolvedFillColor,
    textColor: resolvedTextColor,
  } = viewportButtonInteractColorsForBehavior(
    BathroomPageConsts.BUTTON_FILL_COLOR,
    Viewport2dButtonConsts.OUTLINE_COLOR,
    textColor,
    interactProgress,
    "darken",
    Viewport2dButtonConsts.HOVER_INTERACT_DARKENING_MULT_FACTOR,
  );

  const buttonStyle: CSSProperties = {
    width: "100%",
    margin: 0,
    padding: `${DropdownMenuConsts.PADDING_PIXEL_SIZE}px`,
    borderRadius: Viewport2dButtonConsts.CORNER_RADIUS,
    border: "none",
    backgroundColor: resolvedFillColor,
    color: resolvedTextColor,
    cursor: isPosting || disabled ? "default" : "pointer",
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
      disabled={isPosting || disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      aria-busy={isPosting}
    >
      {isPosting ? (
        <LoadingSpinner
          accentColor={BathroomPageConsts.LOADING_SPINNER_ACCENT_COLOR}
          baseColor={BathroomPageConsts.LOADING_SPINNER_BASE_COLOR}
          radiusPx={BathroomPageConsts.BUTTON_LOADING_SPINNER_RADIUS_PX}
        />
      ) : (
        "Post"
      )}
    </button>
  );
}

type BathroomPageLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; row: BathroomDataPrimaryFullRow }
  | { status: "error" };

/** Bathroom swipe-up page (see specifications/swipe_up_menu/bathroom_page.md). */
export function BathroomPage() {
  const anchorElement = useSwipeMenuContentAnchorElement();
  const { widthPx, heightPx } = useSwipeMenuViewport();
  const menuHeightPx = useSwipeMenuHeightPx();
  const isMenuOpenAboveCollapsed = swipeMenuIsOpenAboveCollapsed(
    menuHeightPx,
    SwipeMenuConsts.INACTIVE_HEIGHT_PX,
  );
  const wasMenuOpenAboveCollapsedRef = useRef(isMenuOpenAboveCollapsed);
  const { selectedBathroomId } = useSelectedBathroom();
  const { showImportantAlert } = useAlertSystem();
  const reportRateLimitViolation = useReportRateLimitViolation();
  const [loadState, setLoadState] = useState<BathroomPageLoadState>({
    status: "idle",
  });
  const [ratingCounts, setRatingCounts] = useState<BathroomRatingCounts | null>(
    null,
  );
  const [draftRating, setDraftRating] = useState(0);
  const [isPostingRating, setIsPostingRating] = useState(false);

  useEffect(() => {
    const previousMenuWasOpenAboveCollapsed =
      wasMenuOpenAboveCollapsedRef.current;
    if (
      swipeMenuJustReopenedAboveCollapsed(
        previousMenuWasOpenAboveCollapsed,
        isMenuOpenAboveCollapsed,
      )
    ) {
      setDraftRating(0);
    }
    wasMenuOpenAboveCollapsedRef.current = isMenuOpenAboveCollapsed;
  }, [isMenuOpenAboveCollapsed]);

  useEffect(() => {
    if (selectedBathroomId == null) {
      setLoadState({ status: "idle" });
      setRatingCounts(null);
      setDraftRating(0);
      setIsPostingRating(false);
      return;
    }

    let cancelled = false;
    setLoadState({ status: "loading" });
    setRatingCounts(null);
    setDraftRating(0);
    setIsPostingRating(false);

    void (async () => {
      const result = await promiseWithTimeout(
        readBathroomById(selectedBathroomId),
        BathroomRemoteDB.READ_RETRY_MS,
      );
      if (cancelled) {
        return;
      }

      const phase = resolveBathroomPageFetchResult(result);
      if (phase === "loaded") {
        if (result === "timeout" || result === "error" || result.val == null) {
          return;
        }
        setLoadState({ status: "loaded", row: result.val });
        setRatingCounts(bathroomRatingCountsFromFullRow(result.val));
        return;
      }

      setLoadState({ status: "error" });

      const errorMsg =
        result !== "timeout" && result !== "error" ? result.errorMsg : undefined;
      if (reportRateLimitViolation(errorMsg)) {
        return;
      }

      showImportantAlert({
        message: bathroomPageFetchFailureAlertMessage(phase),
        okLabel: "Ok",
        positive: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [reportRateLimitViolation, selectedBathroomId, showImportantAlert]);

  const loadedRow = loadState.status === "loaded" ? loadState.row : null;
  const bathroomId = loadedRow?.id ?? selectedBathroomId ?? 0;
  const verifyStatus = loadedRow?.verify_status ?? "pending";
  const bathroomInfoLabel = bathroomInformationLabel(bathroomId, verifyStatus);

  const sideMarginPx = SwipeUpMainMenuConsts.MARGIN_SIDE_PX;
  const dropdownWidthPx = bathroomPageDropdownWidthPx(widthPx, sideMarginPx);
  const dropdownX = bathroomPageDropdownXPx(widthPx, sideMarginPx);
  const loadingSpinnerCenter = bathroomPageLoadingSpinnerCenterPx(
    widthPx,
    heightPx,
  );

  const infoZIndex = useMemo(
    () =>
      typeof window !== "undefined"
        ? viewport2dButtonZIndex(anchorElement, (element) =>
            window.getComputedStyle(element),
          )
        : VIEWPORT2D_TOP_LAYER_Z_INDEX,
    [anchorElement],
  );

  if (anchorElement == null || selectedBathroomId == null) {
    return null;
  }

  if (loadState.status === "loading" || loadState.status === "idle") {
    return createPortal(
      <LoadingSpinner
        accentColor={BathroomPageConsts.LOADING_SPINNER_ACCENT_COLOR}
        baseColor={BathroomPageConsts.LOADING_SPINNER_BASE_COLOR}
        radiusPx={BathroomPageConsts.LOADING_SPINNER_RADIUS_PX}
        x={loadingSpinnerCenter.x}
        y={loadingSpinnerCenter.y}
      />,
      anchorElement,
    );
  }

  if (loadState.status !== "loaded" || ratingCounts == null) {
    return null;
  }

  const totalRatingCount = bathroomTotalRatingCount(ratingCounts);
  const averageRating = bathroomAverageRating(ratingCounts);
  const averageLabel = bathroomAverageRatingLabel(ratingCounts);
  const ratingCountSpace = bathroomRatingCountSpacePx(
    ratingCounts,
    BathroomPageConsts.RATING_COUNT_DIGIT_WIDTH_PX,
    BathroomPageConsts.RATING_COUNT_PADDING_PX,
  );
  const ratingCountsDescending = bathroomRatingCountsDescending(ratingCounts);

  const toggleContent = (
    <BathroomPageToggleContent
      averageLabel={averageLabel}
      averageRating={averageRating}
    />
  );

  const ratingBars = ratingCountsDescending.map((count, index) => (
    <RatingBar
      key={index}
      ratingCount={count}
      ratingCountSpace={ratingCountSpace}
      ratingTotalCount={totalRatingCount}
      leftColor={RATING_BAR_COLORS[index]}
    />
  ));

  const bufferStyle: CSSProperties = {
    height: BathroomPageConsts.RATINGS_PANEL_BUFFER_HEIGHT_PX,
    flexShrink: 0,
  };

  const subcomponents = [
    ...ratingBars,
    <div key="buffer" style={bufferStyle} aria-hidden="true" />,
    <StarRatingGraphic
      key="interactive-stars"
      rating={draftRating}
      interactive
      onRatingChange={setDraftRating}
    />,
    <BathroomPostButton
      key="post-button"
      isPosting={isPostingRating}
      disabled={draftRating <= 0}
      onClick={() => {
        if (draftRating <= 0 || isPostingRating) {
          return;
        }

        const stars = Math.round(draftRating);
        if (stars < 1 || stars > 5) {
          return;
        }

        setIsPostingRating(true);
        void (async () => {
          const result = await incrementBathroomRating(bathroomId, stars);
          if (reportRateLimitViolation(result.errorMsg)) {
            setIsPostingRating(false);
            return;
          }

          if (result.val == null) {
            setIsPostingRating(false);
            showImportantAlert({
              message: "Error occurred while posting rating",
              okLabel: "Ok",
              positive: false,
            });
            return;
          }

          setRatingCounts(bathroomRatingCountsFromFullRow(result.val));
          setDraftRating(0);
          setIsPostingRating(false);
        })();
      }}
    />,
  ];

  const bathroomInfoEl = (
    <div
      style={{
        position: "absolute",
        left: `${sideMarginPx}px`,
        top: `${BathroomPageConsts.DROPDOWN_TOP_OFFSET_PX}px`,
        zIndex: infoZIndex,
        width: `${dropdownWidthPx}px`,
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      <span
        className={TextWeight.BOLD}
        style={{
          color: BathroomPageConsts.TEXT_COLOR,
          fontSize: 14,
          lineHeight: 1.2,
        }}
      >
        {bathroomInfoLabel}
      </span>
    </div>
  );

  return (
    <>
      {createPortal(bathroomInfoEl, anchorElement)}
      <DropdownMenu
        x={dropdownX}
        y={BathroomPageConsts.DROPDOWN_TOP_OFFSET_PX}
        anchorElement={anchorElement}
        widthOverride={`${dropdownWidthPx}px`}
        initialDisplayContent={toggleContent}
        dropShadow={BathroomPageConsts.DROP_SHADOW}
        subcomponents={subcomponents}
      />
    </>
  );
}

function BathroomPageToggleContent({
  averageLabel,
  averageRating,
}: {
  averageLabel: string;
  averageRating: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: BathroomPageConsts.RATINGS_PANEL_AVERAGE_AND_STARS_GAP_PX,
        minWidth: 0,
        width: "100%",
      }}
    >
      <span
        className={TextWeight.BOLD}
        style={{
          color: BathroomPageConsts.TEXT_COLOR,
          fontSize: 14,
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {averageLabel}
      </span>
      <StarRatingGraphic rating={averageRating} />
    </div>
  );
}
