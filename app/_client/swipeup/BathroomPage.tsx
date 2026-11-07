"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import {
  applyBathroomViewportUpsert,
  clearBathroomExistenceVote,
  clearBathroomRating,
  incrementBathroomExistenceVote,
  incrementBathroomRating,
  listBathroomComments,
  readBathroomById,
  readOwnBathroomInteraction,
  withOwnBathroomComment,
  type BathroomComment,
  type OwnBathroomInteraction,
} from "../Bathroom";
import { deriveVerifyStatusFromBathroomFields } from "../../_shared/BathroomDataPrimary";
import {
  ACCOUNT_REQUIRED_ERROR,
  bathroomInteractionLockMessage,
  REPUTATION_TOO_LOW_ERROR,
} from "../../_shared/accounts/AccountReputation";
import { useAccountSession } from "../accounts/AccountSessionContext";
import {
  AccountPage as AccountPageConsts,
  BathroomPage as BathroomPageConsts,
  BathroomRemoteDB,
  DropdownMenu as DropdownMenuConsts,
  SwipeMenu as SwipeMenuConsts,
  SwipeUpMainMenu as SwipeUpMainMenuConsts,
  Viewport2dButton as Viewport2dButtonConsts,
} from "../ComponentConstants";
import { accountProfilePictureImage } from "../pure/accounts/AccountProfilePicture";
import { resolveImageMonoColor } from "../pure/Image";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import {
  bathroomAverageRating,
  bathroomAverageRatingLabel,
  bathroomPostRatingStars,
  bathroomRatingCountSpacePx,
  bathroomRatingCountsDescending,
  bathroomRatingCountsFromFullRow,
  bathroomTotalRatingCount,
  type BathroomRatingCounts,
} from "../pure/bathroom/BathroomRating";
import {
  bathroomExistenceValueFromRow,
  type BathroomExistenceVoteSide,
} from "../pure/bathroom/BathroomInformation";
import {
  bathroomCommentInputVisible,
  bathroomExistenceVoteControlMode,
  bathroomOwnCommentText,
  bathroomRatingControlMode,
} from "../pure/bathroom/BathroomAccountControls";
import { bathroomPageDropdownWidthPx, bathroomPageDropdownXPx } from "../pure/dropdown-menu/DropdownMenuLayout";
import {
  bathroomPageFetchFailureAlertMessage,
  promiseWithTimeout,
  resolveBathroomPageFetchResult,
} from "../pure/swipeup/BathroomPageFetchState";
import {
  bathroomPageDraftRatingAfterSwipeMenuTransition,
  bathroomPageInformationPanelWidthPx,
  bathroomPageInformationPanelXPx,
  bathroomPageLoadingSpinnerCenterPx,
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
import { BathroomInformationPanel } from "./BathroomInformationPanel";
import { useSelectedBathroom } from "./SelectedBathroomContext";
import { useSwipeMenuContentAnchorElement } from "./SwipeMenuContentAnchor";
import { useSwipeMenuHeightPx } from "./SwipeMenuInteraction";
import { useSwipeMenuViewport } from "./SwipeMenuShell";
import { useViewedAccount } from "./ViewedAccountContext";
import {
  bathroomDeleteRatingConfirmationMessage,
  normalizeBathroomCommentContent,
} from "../../_shared/bathroom/BathroomCommentContent";
import { BathroomCommentInput } from "./BathroomCommentInput";
import { StarRatingGraphic } from "./StarRatingGraphic";

const RATING_BAR_COLORS = [
  BathroomPageConsts.STAR_RATING_5_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_4_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_3_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_2_FILL_COLOR,
  BathroomPageConsts.STAR_RATING_1_FILL_COLOR,
] as const;

function BathroomPostButton({
  label,
  isPosting,
  disabled,
  onClick,
  fillColor = BathroomPageConsts.BUTTON_FILL_COLOR,
  textColor = BathroomPageConsts.TEXT_COLOR,
}: {
  label: string;
  isPosting: boolean;
  disabled?: boolean;
  onClick: () => void;
  fillColor?: string;
  textColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = (isHovered || isPressed) && !isPosting;
  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    Viewport2dButtonConsts.ANIMATION_DURATION_MS,
  );

  const {
    fillColor: resolvedFillColor,
    textColor: resolvedTextColor,
  } = viewportButtonInteractColorsForBehavior(
    fillColor,
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
        label
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
  const { profile, refreshProfile } = useAccountSession();
  const { openAccountProfile } = useViewedAccount();
  const interactionLockMessage = bathroomInteractionLockMessage(
    profile !== null,
    profile?.reputationScore ?? null,
  );
  const reportRateLimitViolation = useReportRateLimitViolation();
  const [loadState, setLoadState] = useState<BathroomPageLoadState>({
    status: "idle",
  });
  const [ratingCounts, setRatingCounts] = useState<BathroomRatingCounts | null>(
    null,
  );
  const [existenceValue, setExistenceValue] = useState<number | null>(null);
  const [deletionWaitStartedTimestamp, setDeletionWaitStartedTimestamp] =
    useState<string | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<BathroomComment[]>([]);
  const [pendingRatingAction, setPendingRatingAction] = useState<
    "post" | "edit" | "delete" | null
  >(null);
  const [votingSide, setVotingSide] = useState<BathroomExistenceVoteSide | null>(
    null,
  );
  const [ownInteraction, setOwnInteraction] =
    useState<OwnBathroomInteraction | null>(null);
  const [isClearingVote, setIsClearingVote] = useState(false);
  const interactionVersionRef = useRef(0);

  useEffect(() => {
    const previousMenuWasOpenAboveCollapsed =
      wasMenuOpenAboveCollapsedRef.current;
    setDraftRating((currentDraftRating) =>
      bathroomPageDraftRatingAfterSwipeMenuTransition(
        previousMenuWasOpenAboveCollapsed,
        isMenuOpenAboveCollapsed,
        currentDraftRating,
      ),
    );
    wasMenuOpenAboveCollapsedRef.current = isMenuOpenAboveCollapsed;
  }, [isMenuOpenAboveCollapsed]);

  useEffect(() => {
    if (selectedBathroomId == null) {
      setLoadState({ status: "idle" });
      setRatingCounts(null);
      setExistenceValue(null);
      setDeletionWaitStartedTimestamp(null);
      setDraftRating(0);
      setCommentDraft("");
      setComments([]);
      setPendingRatingAction(null);
      setVotingSide(null);
      setIsClearingVote(false);
      setOwnInteraction(null);
      interactionVersionRef.current += 1;
      return;
    }

    let cancelled = false;
    setLoadState({ status: "loading" });
    setRatingCounts(null);
    setExistenceValue(null);
    setDraftRating(0);
    setCommentDraft("");
    setComments([]);
    setPendingRatingAction(null);
    setVotingSide(null);
    setIsClearingVote(false);
    setOwnInteraction(null);
    interactionVersionRef.current += 1;

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
        setExistenceValue(bathroomExistenceValueFromRow(result.val));
        setDeletionWaitStartedTimestamp(result.val.deletion_wait_started_timestamp);
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

  const accountId = profile?.accountId ?? null;

  useEffect(() => {
    if (selectedBathroomId == null || accountId == null) {
      setOwnInteraction(null);
      return;
    }
    const versionAtStart = interactionVersionRef.current;
    let cancelled = false;
    void (async () => {
      const result = await readOwnBathroomInteraction(selectedBathroomId);
      if (cancelled || versionAtStart !== interactionVersionRef.current) {
        return;
      }
      if (result.val == null) {
        return;
      }
      setOwnInteraction(result.val);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, selectedBathroomId]);

  useEffect(() => {
    if (selectedBathroomId == null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await listBathroomComments(selectedBathroomId);
      if (cancelled) {
        return;
      }
      if (reportRateLimitViolation(result.errorMsg)) {
        return;
      }
      if (result.val == null) {
        showImportantAlert({
          message: "Error occurred while looking up comments",
          okLabel: "Ok",
          positive: false,
        });
        return;
      }
      setComments(result.val);
    })();
    return () => {
      cancelled = true;
    };
  }, [reportRateLimitViolation, selectedBathroomId, showImportantAlert]);

  const loadedRow = loadState.status === "loaded" ? loadState.row : null;
  const bathroomId = loadedRow?.id ?? selectedBathroomId ?? 0;
  const verifyStatus =
    existenceValue === null
      ? "pending"
      : deriveVerifyStatusFromBathroomFields(
          existenceValue,
          deletionWaitStartedTimestamp,
        );

  const sideMarginPx = SwipeUpMainMenuConsts.MARGIN_SIDE_PX;
  const dropdownWidthPx = bathroomPageDropdownWidthPx(widthPx, sideMarginPx);
  const informationPanelWidthPx = bathroomPageInformationPanelWidthPx(
    widthPx,
    sideMarginPx,
  );
  const informationPanelX = bathroomPageInformationPanelXPx(sideMarginPx);
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

  if (loadState.status !== "loaded" || ratingCounts == null || existenceValue == null) {
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

  const voteControl = bathroomExistenceVoteControlMode({
    interactionLocked: interactionLockMessage !== null,
    voteOnCooldown: ownInteraction?.voteOnCooldown === true,
  });
  const ratingControl = bathroomRatingControlMode({
    interactionLocked: interactionLockMessage !== null,
    hasRating: ownInteraction?.ratingStars != null,
  });
  const showCommentInput = bathroomCommentInputVisible(ratingControl);
  const ratingActionPending = pendingRatingAction !== null;
  const ownCommentText = bathroomOwnCommentText(comments, accountId);

  const refreshComments = async (id: number): Promise<boolean> => {
    const result = await listBathroomComments(id);
    if (reportRateLimitViolation(result.errorMsg)) {
      return false;
    }
    if (result.val == null) {
      showImportantAlert({
        message: "Error occurred while looking up comments",
        okLabel: "Ok",
        positive: false,
      });
      return false;
    }
    setComments(result.val);
    return true;
  };

  const commentInput = (
    <BathroomCommentInput
      value={commentDraft}
      disabled={ratingActionPending}
      onChange={setCommentDraft}
    />
  );

  const subcomponents = [
    ...ratingBars,
    <div key="buffer" style={bufferStyle} aria-hidden="true" />,
    ...(ratingControl === "edit"
      ? [
          <div
            key="edit-rating-actions"
            style={{
              display: "flex",
              gap: BathroomPageConsts.COMPONENTS_GAP_PX,
              width: "100%",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <BathroomPostButton
                label="Edit"
                isPosting={pendingRatingAction === "edit"}
                disabled={ratingActionPending}
                fillColor={BathroomPageConsts.TEXT_COLOR}
                textColor={BathroomPageConsts.BUTTON_FILL_COLOR}
                onClick={() => {
                  if (ratingActionPending) {
                    return;
                  }
                  setPendingRatingAction("edit");
                  void (async () => {
                    const preservedComment =
                      normalizeBathroomCommentContent(ownCommentText);
                    const result = await clearBathroomRating(
                      bathroomId,
                      preservedComment == null
                        ? null
                        : {
                            comment: preservedComment,
                            deleteComment: false,
                          },
                    );
                    if (reportRateLimitViolation(result.errorMsg)) {
                      setPendingRatingAction(null);
                      return;
                    }
                    if (result.val == null) {
                      setPendingRatingAction(null);
                      showImportantAlert({
                        message: "Error occurred while editing rating",
                        okLabel: "Ok",
                        positive: false,
                      });
                      return;
                    }
                    interactionVersionRef.current += 1;
                    setOwnInteraction((current) => ({
                      voteForExists: current?.voteForExists ?? null,
                      voteOnCooldown: current?.voteOnCooldown === true,
                      ratingStars: null,
                    }));
                    setRatingCounts(bathroomRatingCountsFromFullRow(result.val));
                    setDraftRating(0);
                    setCommentDraft(ownCommentText);
                    if (accountId != null && preservedComment != null) {
                      setComments((current) =>
                        withOwnBathroomComment(
                          current,
                          accountId,
                          preservedComment,
                          null,
                          profile?.profilePictureDataUrl ?? null,
                        ),
                      );
                    }
                    await refreshComments(bathroomId);
                    setPendingRatingAction(null);
                  })();
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <BathroomPostButton
                label="Delete"
                isPosting={pendingRatingAction === "delete"}
                disabled={ratingActionPending}
                fillColor={BathroomPageConsts.TEXT_COLOR}
                textColor={BathroomPageConsts.BUTTON_FILL_COLOR}
                onClick={() => {
                  if (ratingActionPending) {
                    return;
                  }
                  showImportantAlert({
                    message: bathroomDeleteRatingConfirmationMessage(
                      ownCommentText.length > 0,
                    ),
                    positive: false,
                    buttons: [
                      {
                        label: "Delete",
                        style: "accent",
                        onClick: () => {
                          setPendingRatingAction("delete");
                          void (async () => {
                            const result = await clearBathroomRating(bathroomId, {
                              comment: null,
                              deleteComment: true,
                            });
                            if (reportRateLimitViolation(result.errorMsg)) {
                              setPendingRatingAction(null);
                              return;
                            }
                            if (result.val == null) {
                              setPendingRatingAction(null);
                              showImportantAlert({
                                message: "Error occurred while deleting rating",
                                okLabel: "Ok",
                                positive: false,
                              });
                              return;
                            }
                            interactionVersionRef.current += 1;
                            setOwnInteraction((current) => ({
                              voteForExists: current?.voteForExists ?? null,
                              voteOnCooldown: current?.voteOnCooldown === true,
                              ratingStars: null,
                            }));
                            setRatingCounts(
                              bathroomRatingCountsFromFullRow(result.val),
                            );
                            setDraftRating(0);
                            setCommentDraft("");
                            if (accountId != null) {
                              setComments((current) =>
                                withOwnBathroomComment(current, accountId, null, null),
                              );
                            }
                            await refreshComments(bathroomId);
                            setPendingRatingAction(null);
                          })();
                        },
                      },
                      { label: "Cancel", style: "background" },
                    ],
                  });
                }}
              />
            </div>
          </div>,
        ]
      : [
          <StarRatingGraphic
            key="interactive-stars"
            rating={draftRating}
            interactive
            onRatingChange={setDraftRating}
          />,
          ...(showCommentInput
            ? [
                <div key="comment-input" style={{ width: "100%" }}>
                  {commentInput}
                </div>,
              ]
            : []),
          <BathroomPostButton
            key="post-button"
            label="Post"
            isPosting={pendingRatingAction === "post"}
            disabled={ratingActionPending}
            onClick={() => {
              if (ratingActionPending) {
                return;
              }
              const stars = bathroomPostRatingStars(draftRating, false);
              if (stars == null) {
                showImportantAlert({
                  message: "Input a star rating",
                  okLabel: "Ok",
                  positive: false,
                });
                return;
              }
              if (interactionLockMessage !== null) {
                showImportantAlert({
                  message: interactionLockMessage,
                  okLabel: "Ok",
                  positive: false,
                });
                return;
              }

              const storedComment = normalizeBathroomCommentContent(commentDraft);
              setPendingRatingAction("post");
              void (async () => {
                const result = await incrementBathroomRating(
                  bathroomId,
                  stars,
                  storedComment,
                );
                if (reportRateLimitViolation(result.errorMsg)) {
                  setPendingRatingAction(null);
                  return;
                }

                if (result.val == null) {
                  setPendingRatingAction(null);
                  showImportantAlert({
                    message: "Error occurred while posting rating",
                    okLabel: "Ok",
                    positive: false,
                  });
                  return;
                }

                interactionVersionRef.current += 1;
                setOwnInteraction((current) => ({
                  voteForExists: current?.voteForExists ?? null,
                  voteOnCooldown: current?.voteOnCooldown === true,
                  ratingStars: stars,
                }));
                setRatingCounts(bathroomRatingCountsFromFullRow(result.val));
                setDraftRating(0);
                setCommentDraft("");
                if (accountId != null) {
                  setComments((current) => {
                    if (storedComment !== null) {
                      return withOwnBathroomComment(
                        current,
                        accountId,
                        storedComment,
                        stars,
                        profile?.profilePictureDataUrl ?? null,
                      );
                    }
                    const existing = current.find(
                      (comment) => comment.accountId === accountId,
                    );
                    if (existing == null) {
                      return current;
                    }
                    return withOwnBathroomComment(
                      current,
                      accountId,
                      existing.content,
                      stars,
                      profile?.profilePictureDataUrl ?? null,
                    );
                  });
                }
                await refreshComments(bathroomId);
                setPendingRatingAction(null);
                void refreshProfile();
              })();
            }}
          />,
        ]),
    ...(comments.length > 0
      ? [
          <BathroomCommentList
            key="comments"
            comments={comments}
            onOpenAccountProfile={openAccountProfile}
          />,
        ]
      : []),
  ];

  const bathroomInfoEl = (
    <div
      style={{
        position: "absolute",
        left: `${informationPanelX}px`,
        top: `${BathroomPageConsts.DROPDOWN_TOP_OFFSET_PX}px`,
        zIndex: infoZIndex,
        width: `${informationPanelWidthPx}px`,
        boxSizing: "border-box",
      }}
    >
      <BathroomInformationPanel
        verifyStatus={verifyStatus}
        widthPx={informationPanelWidthPx}
        existenceValue={existenceValue}
        votingSide={votingSide}
        voteOnCooldown={voteControl === "edit"}
        isClearingVote={isClearingVote}
        interactionLockMessage={interactionLockMessage}
        onClearVote={() => {
          if (isClearingVote || votingSide !== null) {
            return;
          }
          setIsClearingVote(true);
          void (async () => {
            const result = await clearBathroomExistenceVote(bathroomId);
            if (reportRateLimitViolation(result.errorMsg)) {
              setIsClearingVote(false);
              return;
            }
            if (result.val == null) {
              setIsClearingVote(false);
              showImportantAlert({
                message: "Error occurred while editing vote",
                okLabel: "Ok",
                positive: false,
              });
              return;
            }
            interactionVersionRef.current += 1;
            setOwnInteraction((current) => ({
              voteForExists: null,
              voteOnCooldown: false,
              ratingStars: current?.ratingStars ?? null,
            }));
            setExistenceValue(bathroomExistenceValueFromRow(result.val));
            setDeletionWaitStartedTimestamp(
              result.val.deletion_wait_started_timestamp,
            );
            await applyBathroomViewportUpsert(result.val);
            setIsClearingVote(false);
          })();
        }}
        onVote={(side) => {
          if (interactionLockMessage !== null) {
            showImportantAlert({
              message: interactionLockMessage,
              okLabel: "Ok",
              positive: false,
            });
            return;
          }
          if (votingSide !== null) {
            return;
          }

          setVotingSide(side);
          void (async () => {
            const result = await incrementBathroomExistenceVote(
              bathroomId,
              side === "exists",
            );
            if (reportRateLimitViolation(result.errorMsg)) {
              setVotingSide(null);
              return;
            }

            if (result.val == null) {
              setVotingSide(null);
              const denied =
                result.errorMsg?.includes(ACCOUNT_REQUIRED_ERROR) === true ||
                result.errorMsg?.includes(REPUTATION_TOO_LOW_ERROR) === true;
              showImportantAlert({
                message: denied
                  ? (bathroomInteractionLockMessage(
                      profile !== null,
                      profile?.reputationScore ?? null,
                    ) ?? result.errorMsg ?? "Error occurred while posting existence vote")
                  : "Error occurred while posting existence vote",
                okLabel: "Ok",
                positive: false,
              });
              void refreshProfile();
              return;
            }

            setExistenceValue(bathroomExistenceValueFromRow(result.val));
            setDeletionWaitStartedTimestamp(
              result.val.deletion_wait_started_timestamp,
            );
            interactionVersionRef.current += 1;
            setOwnInteraction((current) => ({
              voteForExists: side === "exists",
              voteOnCooldown: true,
              ratingStars: current?.ratingStars ?? null,
            }));
            await applyBathroomViewportUpsert(result.val);
            setVotingSide(null);
            void refreshProfile();
          })();
        }}
      />
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

function BathroomCommentList({
  comments,
  onOpenAccountProfile,
}: {
  comments: readonly BathroomComment[];
  onOpenAccountProfile: (accountId: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: BathroomPageConsts.COMPONENTS_GAP_PX,
        width: "100%",
      }}
    >
      {comments.map((comment) => {
        const picture = accountProfilePictureImage(
          comment.profilePictureDataUrl,
          AccountPageConsts.PROFILE_PICTURE,
        );
        const pictureMonoColor = resolveImageMonoColor(picture);
        return (
          <div
            key={comment.accountId}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: BathroomPageConsts.COMMENT_PROFILE_PICTURE_GAP_PX,
              width: "100%",
            }}
          >
            <button
              type="button"
              aria-label="Open account profile"
              onClick={() => onOpenAccountProfile(comment.accountId)}
              style={{
                margin: 0,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                width: BathroomPageConsts.COMMENT_PROFILE_PICTURE_SIZE_PX,
                height: BathroomPageConsts.COMMENT_PROFILE_PICTURE_SIZE_PX,
              }}
            >
              <img
                src={picture.path}
                alt=""
                width={BathroomPageConsts.COMMENT_PROFILE_PICTURE_SIZE_PX}
                height={BathroomPageConsts.COMMENT_PROFILE_PICTURE_SIZE_PX}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: pictureMonoColor == null ? "cover" : "contain",
                  filter:
                    pictureMonoColor == null
                      ? undefined
                      : blackMonoIconCssFilter(pictureMonoColor),
                }}
              />
            </button>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: BathroomPageConsts.RATINGS_PANEL_AVERAGE_AND_STARS_GAP_PX,
                minWidth: 0,
                flex: 1,
              }}
            >
              {comment.ratingStars != null ? (
                <StarRatingGraphic rating={comment.ratingStars} />
              ) : null}
              <p
                style={{
                  margin: 0,
                  color: BathroomPageConsts.TEXT_COLOR,
                  fontSize: BathroomPageConsts.COMMENT_INPUT_FONT_SIZE_PX,
                  lineHeight: BathroomPageConsts.COMMENT_INPUT_LINE_HEIGHT,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {comment.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
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
