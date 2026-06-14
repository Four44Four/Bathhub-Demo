"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { UserSettingsPageId } from "@/app/_shared/user-settings/UserSettingsPageDefinition";

export type UserSettingsContextValue = {
  isOpen: boolean;
  pageStack: UserSettingsPageId[];
  currentPageId: UserSettingsPageId;
  openSettings: () => void;
  closeSettings: () => void;
  pushPage: (pageId: UserSettingsPageId) => void;
  popPage: () => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export type UserSettingsProviderProps = {
  children: ReactNode;
};

export function UserSettingsProvider({ children }: UserSettingsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pageStack, setPageStack] = useState<UserSettingsPageId[]>(["root"]);

  const openSettings = useCallback(() => {
    setPageStack(["root"]);
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
    setPageStack(["root"]);
  }, []);

  const pushPage = useCallback((pageId: UserSettingsPageId) => {
    setPageStack((stack) => [...stack, pageId]);
  }, []);

  const popPage = useCallback(() => {
    setPageStack((stack) => {
      if (stack.length <= 1) {
        setIsOpen(false);
        return ["root"];
      }
      return stack.slice(0, -1);
    });
  }, []);

  const currentPageId = pageStack[pageStack.length - 1] ?? "root";

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      isOpen,
      pageStack,
      currentPageId,
      openSettings,
      closeSettings,
      pushPage,
      popPage,
    }),
    [closeSettings, currentPageId, isOpen, openSettings, pageStack, popPage, pushPage],
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  if (ctx == null) {
    throw new Error("useUserSettings must be used within UserSettingsProvider.");
  }
  return ctx;
}
