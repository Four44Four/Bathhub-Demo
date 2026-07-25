import { BathroomPage as BathroomPageConsts } from "../../ComponentConstants";
import type { VerifyStatus } from "../../../_shared/BathroomDataPrimary";
import { clamp01 } from "../../Utils";
import { dropdownMenuQuadraticEase } from "../dropdown-menu/DropdownMenuLayout";
import { dropshadowVisibleOverflowPaddingPx } from "../Dropshadow";
import { multiplyHexColorBrightness } from "../viewport2d/ButtonInteractColor";

export type BathroomInformationPanelExpandedContentShadowInset = {
  /** Extra bottom room inside expanded content for button drop shadows. */
  paddingBottomPx: number;
  /** Horizontal inset so content stays aligned after the body clip bleeds. */
  paddingLeftPx: number;
  paddingRightPx: number;
  /**
   * Negative margins for the overflow-clipping body slot so it spans into the
   * panel's side padding (where button drop shadows must remain visible).
   */
  bodyClipMarginLeftPx: number;
  bodyClipMarginRightPx: number;
};

/** Padding reserved so panel child drop shadows are not clipped. */
export function bathroomInformationPanelDropShadowPaddingPx(): number {
  return dropshadowVisibleOverflowPaddingPx(BathroomPageConsts.DROP_SHADOW);
}

/**
 * Inset and bleed for expanded panel content so drop shadows can extend into the
 * panel's side padding without being clipped.
 *
 * Horizontal bleed margins belong on the body clip (`overflow: hidden`), not the
 * inner content — otherwise the clip box still excludes the padding region and
 * trims button shadows.
 */
export function bathroomInformationPanelExpandedContentShadowInset(
  panelPaddingPx: number,
): BathroomInformationPanelExpandedContentShadowInset {
  const shadowPaddingPx = bathroomInformationPanelDropShadowPaddingPx();
  const horizontalBleedPx = Math.min(shadowPaddingPx, panelPaddingPx);
  return {
    paddingBottomPx: shadowPaddingPx,
    paddingLeftPx: horizontalBleedPx,
    paddingRightPx: horizontalBleedPx,
    bodyClipMarginLeftPx: -horizontalBleedPx,
    bodyClipMarginRightPx: -horizontalBleedPx,
  };
}

/**
 * Animated body-slot height while the panel expands or collapses.
 * Interpolates from zero (collapsed) to the measured expanded content height.
 */
export function bathroomInformationPanelBodyHeightPx(
  expandedProgress: number,
  expandedContentHeightPx: number,
): number {
  const eased = dropdownMenuQuadraticEase(expandedProgress);
  return eased * expandedContentHeightPx;
}

/** Body clip height including room for expanded content drop shadows. */
export function bathroomInformationPanelBodyClipHeightPx(
  expandedProgress: number,
  expandedContentHeightPx: number,
): number {
  return bathroomInformationPanelBodyHeightPx(
    expandedProgress,
    expandedContentHeightPx + bathroomInformationPanelDropShadowPaddingPx(),
  );
}

/**
 * Arrow rotation in degrees for the bathroom information panel.
 * Collapsed: 90° (down); expanded: -90° (up), with quadratic easing.
 */
export function bathroomInformationPanelArrowRotationDeg(
  expandedProgress: number,
): number {
  const eased = dropdownMenuQuadraticEase(expandedProgress);
  return 90 - eased * 180;
}

/** Dedicated arrow row height for the bathroom information panel (CSS px). */
export function bathroomInformationPanelArrowRowHeightPx(): number {
  return BathroomPageConsts.BATHROOM_INFORMATION_PANEL_ARROW_ROW_HEIGHT_PX;
}

/** Linear fade opacity for expanded panel content (0 = hidden, 1 = visible). */
export function bathroomInformationPanelExpandedContentOpacity(
  contentFadeProgress: number,
): number {
  return clamp01(contentFadeProgress);
}

/** Whether the bathroom icon should receive panel hover darkening. */
export function bathroomInformationPanelIconShouldHighlight(
  isPanelHoveredOrPressed: boolean,
  isVoteButtonHighlighted: boolean,
): boolean {
  return isPanelHoveredOrPressed && !isVoteButtonHighlighted;
}

/** Label for the bathroom information row (see bathroom_page.md). */
export function bathroomInformationLabel(
  bathroomId: number,
  verifyStatus: VerifyStatus,
): string {
  const statusLabel =
    verifyStatus === "verified" ? "verified" : "pending-verify";
  return `${bathroomId} ${statusLabel}`;
}

/** Mono-color tint for the bathroom information panel icon. */
export function bathroomInformationPanelIconColor(
  verifyStatus: VerifyStatus,
): string {
  return verifyStatus === "verified"
    ? BathroomPageConsts.VERIFIED_COLOR
    : BathroomPageConsts.NON_VERIFIED_COLOR;
}

/** SVG path for the bathroom information panel icon. */
export function bathroomInformationPanelIconPath(
  verifyStatus: VerifyStatus,
): string {
  return verifyStatus === "verified"
    ? BathroomPageConsts.BATHROOM_ICON_PATH
    : BathroomPageConsts.BATHROOM_NON_VERIFIED_ICON_PATH;
}

export type BathroomExistenceVoteCounts = {
  forCount: number;
  againstCount: number;
};

/**
 * Stub vote counts while bathroom_data_primary has no existence-vote columns
 * (see bathroom_page.md TESTING notice).
 */
export function bathroomExistenceVoteStubCounts(): BathroomExistenceVoteCounts {
  return { forCount: 1, againstCount: 1 };
}

/** Fraction of the existence vote bar width allocated to votes for (0–1). */
export function bathroomExistenceVoteForRatio(
  forCount: number,
  againstCount: number,
): number {
  const total = forCount + againstCount;
  if (total <= 0) {
    return 0.5;
  }
  return forCount / total;
}

/** Text color for the for-vote count beside the existence vote bar. */
export function bathroomExistenceVoteBarForLabelColor(): string {
  return multiplyHexColorBrightness(
    BathroomPageConsts.VERIFIED_COLOR,
    BathroomPageConsts.BATHROOM_INFORMATION_PANEL_EXISTENCE_VOTE_BAR_TEXT_COLOR_BRIGHTNESS_MULT_FACTOR,
  );
}

/** Text color for the against-vote count beside the existence vote bar. */
export function bathroomExistenceVoteBarAgainstLabelColor(): string {
  return multiplyHexColorBrightness(
    BathroomPageConsts.NON_VERIFIED_COLOR,
    BathroomPageConsts.BATHROOM_INFORMATION_PANEL_EXISTENCE_VOTE_BAR_TEXT_COLOR_BRIGHTNESS_MULT_FACTOR,
  );
}
