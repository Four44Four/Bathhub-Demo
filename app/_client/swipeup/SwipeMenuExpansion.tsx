"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type SwipeMenuExpansionApi = {
  registerExpandHandler: (handler: (() => void) | null) => () => void;
  expandSwipeMenu: () => void;
};

export const SwipeMenuExpansionContext = createContext<SwipeMenuExpansionApi>({
  registerExpandHandler: () => () => {},
  expandSwipeMenu: () => {},
});

export function SwipeMenuExpansionProvider({ children }: { children: ReactNode }) {
  const expandHandlerRef = useRef<(() => void) | null>(null);

  const registerExpandHandler = useCallback((handler: (() => void) | null) => {
    expandHandlerRef.current = handler;
    return () => {
      if (expandHandlerRef.current === handler) {
        expandHandlerRef.current = null;
      }
    };
  }, []);

  const expandSwipeMenu = useCallback(() => {
    expandHandlerRef.current?.();
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

export function useExpandSwipeMenu(): () => void {
  return useContext(SwipeMenuExpansionContext).expandSwipeMenu;
}

export function useRegisterSwipeMenuExpandHandler(): SwipeMenuExpansionApi["registerExpandHandler"] {
  return useContext(SwipeMenuExpansionContext).registerExpandHandler;
}
