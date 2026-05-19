"use client";

import { createContext, useContext } from "react";

export type SwipeMenuInteraction = {
  /** True while the swipe-up menu is taller than its collapsed handle strip. */
  blocksViewportPointer: boolean;
};

export const SwipeMenuInteractionContext = createContext<SwipeMenuInteraction>({
  blocksViewportPointer: false,
});

let viewportClickSuppressedUntilMs = 0;

/** Ignore viewport button clicks until this time (after menu dismiss tap). */
export function suppressViewportClicksBriefly(durationMs = 400): void {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  viewportClickSuppressedUntilMs = now + durationMs;
}

export function areViewportClicksSuppressed(): boolean {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return now < viewportClickSuppressedUntilMs;
}

export function useSwipeMenuBlocksViewport(): boolean {
  return useContext(SwipeMenuInteractionContext).blocksViewportPointer;
}
