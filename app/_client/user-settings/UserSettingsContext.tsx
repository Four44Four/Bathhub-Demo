"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { UserSettingsPageId } from "@/app/_shared/user-settings/UserSettingsPageDefinition";
import type { UserSettingsRow } from "@/app/_shared/user-settings/UserSettingsSchema";
import { getUserSettingsDb } from "../user-settings-db/web/UserSettingsDbWeb";

export type UserSettingsContextValue = {
  isOpen: boolean;
  pageStack: UserSettingsPageId[];
  currentPageId: UserSettingsPageId;
  settings: UserSettingsRow | null;
  refresh: () => Promise<void>;
  setBoolean: (
    column: "globe_movement_smooth",
    value: boolean,
  ) => Promise<void>;
  setInt: (
    column: "camera_init_surface_offset_m" | "find_nearest_bathroom_max_dist_m",
    value: number,
  ) => Promise<void>;
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
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);

  const refresh = useCallback(async () => {
    const db = getUserSettingsDb();
    await db.init();
    setSettings(await db.getSettings());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setBoolean = useCallback(
    async (column: "globe_movement_smooth", value: boolean) => {
      const db = getUserSettingsDb();
      await db.updateBooleanSetting(column, value);
      setSettings(await db.getSettings());
    },
    [],
  );

  const setInt = useCallback(
    async (
      column: "camera_init_surface_offset_m" | "find_nearest_bathroom_max_dist_m",
      value: number,
    ) => {
      const db = getUserSettingsDb();
      await db.updateIntSetting(column, value);
      setSettings(await db.getSettings());
    },
    [],
  );

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
      settings,
      refresh,
      setBoolean,
      setInt,
      openSettings,
      closeSettings,
      pushPage,
      popPage,
    }),
    [
      closeSettings,
      currentPageId,
      isOpen,
      openSettings,
      pageStack,
      popPage,
      pushPage,
      refresh,
      setBoolean,
      setInt,
      settings,
    ],
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
