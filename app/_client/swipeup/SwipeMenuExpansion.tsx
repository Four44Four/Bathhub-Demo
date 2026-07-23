"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import type { SwipeMenuPageId } from "../pure/swipeup/SwipeMenuPage";

export type SwipeMenuExpandRequest = {
  pageId?: SwipeMenuPageId;
};

export type SwipeMenuExpansionApi = {
  registerExpandHandler: (
    handler: ((request: SwipeMenuExpandRequest) => void) | null,
  ) => () => void;
  expandSwipeMenu: (request?: SwipeMenuExpandRequest) => void;
};

export const SwipeMenuExpansionContext = createContext<SwipeMenuExpansionApi>({
  registerExpandHandler: () => () => {},
  expandSwipeMenu: () => {},
});

export function SwipeMenuExpansionProvider({ children }: { children: ReactNode }) {
  const expandHandlerRef = useRef<
    ((request: SwipeMenuExpandRequest) => void) | null
  >(null);

  const registerExpandHandler = useCallback(
    (handler: ((request: SwipeMenuExpandRequest) => void) | null) => {
      expandHandlerRef.current = handler;
      return () => {
        if (expandHandlerRef.current === handler) {
          expandHandlerRef.current = null;
        }
      };
    },
    [],
  );

  const expandSwipeMenu = useCallback((request: SwipeMenuExpandRequest = {}) => {
    expandHandlerRef.current?.(request);
  }, []);

  const value = useMemo(
    () => ({ registerExpandHandler, expandSwipeMenu }),
    [registerExpandHandler, expandSwipeMenu],
  );

  return (
    <SwipeMenuExpansionContext.Provider value={value}>
      {children}
    </SwipeMenuExpansionContext.Provider>
  );
}

export function useExpandSwipeMenu(): SwipeMenuExpansionApi["expandSwipeMenu"] {
  return useContext(SwipeMenuExpansionContext).expandSwipeMenu;
}

export function useRegisterSwipeMenuExpandHandler(): SwipeMenuExpansionApi["registerExpandHandler"] {
  return useContext(SwipeMenuExpansionContext).registerExpandHandler;
}
