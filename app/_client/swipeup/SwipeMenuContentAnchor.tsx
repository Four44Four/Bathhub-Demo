"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

export const SwipeMenuContentAnchorContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function useSwipeMenuContentAnchor(): RefObject<HTMLElement | null> | null {
  return useContext(SwipeMenuContentAnchorContext);
}

/** Returns the swipe-up menu content anchor element once mounted. */
export function useSwipeMenuContentAnchorElement(): HTMLElement | null {
  const anchorRef = useSwipeMenuContentAnchor();
  const [element, setElement] = useState<HTMLElement | null>(
    () => anchorRef?.current ?? null,
  );

  useLayoutEffect(() => {
    setElement(anchorRef?.current ?? null);
  });

  return element;
}
