"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

import {
  SWIPE_MENU_DEFAULT_PAGE_ID,
  type SwipeMenuPageId,
} from "../pure/swipeup/SwipeMenuPage";
import { useExpandSwipeMenu } from "./SwipeMenuExpansion";

export type SwipeMenuPageApi = {
  pageId: SwipeMenuPageId;
  setPageId: (pageId: SwipeMenuPageId) => void;
  navigateToPage: (pageId: SwipeMenuPageId) => void;
  expandToPage: (pageId: SwipeMenuPageId) => void;
  openMainMenuPage: () => void;
};

export const SwipeMenuPageContext = createContext<SwipeMenuPageApi | null>(null);

export function SwipeMenuPageProvider({ children }: { children: ReactNode }) {
  const expandSwipeMenu = useExpandSwipeMenu();
  const [pageId, setPageId] = useState<SwipeMenuPageId>(SWIPE_MENU_DEFAULT_PAGE_ID);

  const navigateToPage = useCallback((nextPageId: SwipeMenuPageId) => {
    flushSync(() => {
      setPageId(nextPageId);
    });
  }, []);

  const openMainMenuPage = useCallback(() => {
    navigateToPage("mainMenu");
  }, [navigateToPage]);

  const expandToPage = useCallback(
    (nextPageId: SwipeMenuPageId) => {
      expandSwipeMenu({ pageId: nextPageId });
    },
    [expandSwipeMenu],
  );

  const value = useMemo(
    () => ({
      pageId,
      setPageId,
      navigateToPage,
      expandToPage,
      openMainMenuPage,
    }),
    [expandToPage, navigateToPage, openMainMenuPage, pageId],
  );

  return (
    <SwipeMenuPageContext.Provider value={value}>
      {children}
    </SwipeMenuPageContext.Provider>
  );
}

export function useSwipeMenuPage(): SwipeMenuPageApi {
  const value = useContext(SwipeMenuPageContext);
  if (value === null) {
    throw new Error("useSwipeMenuPage must be used within SwipeMenuPageProvider");
  }
  return value;
}
