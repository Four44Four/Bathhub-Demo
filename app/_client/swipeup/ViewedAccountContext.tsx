"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSwipeMenuPage } from "./SwipeMenuPageContext";

export type ViewedAccountApi = {
  viewedAccountId: string | null;
  openAccountProfile: (accountId: string) => void;
  openOwnAccountProfile: () => void;
  clearViewedAccount: () => void;
};

const ViewedAccountContext = createContext<ViewedAccountApi | null>(null);

export function ViewedAccountProvider({ children }: { children: ReactNode }) {
  const { navigateToPage } = useSwipeMenuPage();
  const [viewedAccountId, setViewedAccountId] = useState<string | null>(null);

  const openAccountProfile = useCallback(
    (accountId: string) => {
      setViewedAccountId(accountId);
      navigateToPage("account");
    },
    [navigateToPage],
  );

  const openOwnAccountProfile = useCallback(() => {
    setViewedAccountId(null);
    navigateToPage("account");
  }, [navigateToPage]);

  const clearViewedAccount = useCallback(() => {
    setViewedAccountId(null);
  }, []);

  const value = useMemo(
    () => ({
      viewedAccountId,
      openAccountProfile,
      openOwnAccountProfile,
      clearViewedAccount,
    }),
    [
      clearViewedAccount,
      openAccountProfile,
      openOwnAccountProfile,
      viewedAccountId,
    ],
  );

  return (
    <ViewedAccountContext.Provider value={value}>
      {children}
    </ViewedAccountContext.Provider>
  );
}

export function useViewedAccount(): ViewedAccountApi {
  const value = useContext(ViewedAccountContext);
  if (value === null) {
    throw new Error(
      "useViewedAccount must be used within ViewedAccountProvider",
    );
  }
  return value;
}
