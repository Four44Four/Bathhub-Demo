"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import type {
  UserSettingsPageId,
  UserSettingsBooleanColumnName,
  UserSettingsNumericColumnName,
} from "@/app/_shared/user-settings/UserSettingsPageDefinition";
import {
  USER_SETTINGS_DEFAULTS,
  type UserSettingsRow,
} from "@/app/_shared/user-settings/UserSettingsSchema";
import { cloneUserSettingsRow } from "@/app/_shared/user-settings/UserSettingsRowUtils";
import type { UserSettingsSchemaBootstrapPhase } from "@/app/_shared/user-settings/UserSettingsSchemaBootstrap";
import {
  shouldEnterSchemaOutOfDateDuringBootstrap,
  shouldScheduleUserSettingsBootstrapRetry,
} from "@/app/_shared/user-settings/UserSettingsBootstrapOrchestration";
import {
  resolveSettingsCloseInteraction,
  shouldAllowPendingSettingsMutation,
} from "@/app/_shared/user-settings/UserSettingsOverlayBehavior";
import {
  initialUserSettingsUiState,
  reduceUserSettingsUiState,
} from "@/app/_shared/user-settings/UserSettingsProviderState";
import { UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { getUserSettingsDb } from "../user-settings-db/web/UserSettingsDbWeb";
import {
  getActiveUserSettings,
  setActiveUserSettings,
} from "./UserSettingsMemoryStore";
import {
  attemptUserSettingsSchemaBootstrap,
  finishUserSettingsBootstrapReady,
} from "./UserSettingsBootstrapAttempt";
import { currentUserSettingsPageId } from "@/app/_shared/user-settings/UserSettingsPageStack";
import {
  saveActiveUserSettingsToPersistentDb,
  defaultUserSettingsSchemaMigrationRunnerDeps,
  type UserSettingsSchemaMigrationRunnerDeps,
} from "./UserSettingsSchemaMigrationRunner";
import { USER_SETTINGS_FRONTEND_SCHEMA_VERSION } from "./UserSettingsSchemaVersion";
import { useReportRateLimitViolation } from "../pure/rate-limit/useReportRateLimitViolation";

export type UserSettingsBootstrapPhase =
  | "loading"
  | UserSettingsSchemaBootstrapPhase;

export type UserSettingsContextValue = {
  bootstrapPhase: UserSettingsBootstrapPhase;
  schemaUpdateHasErrored: boolean;
  isOpen: boolean;
  pageStack: UserSettingsPageId[];
  currentPageId: UserSettingsPageId;
  /** In-memory settings used by application logic. */
  settings: UserSettingsRow;
  /** Pending edits in the settings UI; null while settings are closed. */
  pendingSettings: UserSettingsRow | null;
  hasEditedSettings: boolean;
  isSaving: boolean;
  refreshFromMemory: () => void;
  setPendingBoolean: (
    column: UserSettingsBooleanColumnName,
    value: boolean,
  ) => void;
  setPendingInt: (
    column: UserSettingsNumericColumnName,
    value: number,
  ) => void;
  savePendingChanges: () => Promise<void>;
  openSettings: () => void;
  requestCloseSettings: () => boolean;
  closeSettingsWithoutSave: () => void;
  pushPage: (pageId: UserSettingsPageId) => void;
  popPage: () => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export type UserSettingsProviderProps = {
  children: ReactNode;
};

export function UserSettingsProvider({ children }: UserSettingsProviderProps) {
  const [bootstrapPhase, setBootstrapPhase] =
    useState<UserSettingsBootstrapPhase>("loading");
  const [settings, setSettings] = useState<UserSettingsRow>(
    () => getActiveUserSettings(),
  );
  const [uiState, dispatchUi] = useReducer(
    reduceUserSettingsUiState,
    initialUserSettingsUiState,
  );
  const {
    isOpen,
    pageStack,
    pendingSettings,
    hasEditedSettings,
    isSaving,
  } = uiState;

  const refreshFromMemory = useCallback(() => {
    setSettings(getActiveUserSettings());
  }, []);

  const reportRateLimitViolation = useReportRateLimitViolation();
  const migrationRunnerDeps = useMemo<UserSettingsSchemaMigrationRunnerDeps>(
    () => ({
      ...defaultUserSettingsSchemaMigrationRunnerDeps,
      onRateLimitViolation: (errorMsg) => {
        reportRateLimitViolation(errorMsg);
      },
    }),
    [reportRateLimitViolation],
  );

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (retryTimer != null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const finishReady = async (migrationHasErrored: boolean) => {
      const db = getUserSettingsDb();
      const phase = await finishUserSettingsBootstrapReady(
        db,
        migrationHasErrored,
      );
      if (cancelled) return;
      refreshFromMemory();
      setBootstrapPhase(phase);
    };

    const attemptBootstrap = async () => {
      const db = getUserSettingsDb();
      await db.init();
      if (cancelled) return "retry" as const;

      const persistentVersion = await db.getPersistentSchemaVersion();
      if (
        shouldEnterSchemaOutOfDateDuringBootstrap(
          persistentVersion,
          USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
        )
      ) {
        setBootstrapPhase("schema_out_of_date");
      }

      const outcome = await attemptUserSettingsSchemaBootstrap(
        db,
        finishReady,
        USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
        migrationRunnerDeps,
      );
      if (cancelled) return "retry" as const;
      return outcome;
    };

    const loop = async () => {
      clearRetry();
      try {
        const outcome = await attemptBootstrap();
        if (!shouldScheduleUserSettingsBootstrapRetry(outcome, cancelled)) {
          return;
        }
        retryTimer = setTimeout(() => {
          void loop();
        }, UserSettingsConsts.SCHEMA_RETRY_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          setBootstrapPhase("schema_out_of_date");
          retryTimer = setTimeout(() => {
            void loop();
          }, UserSettingsConsts.SCHEMA_RETRY_INTERVAL_MS);
        }
      }
    };

    void loop();

    return () => {
      cancelled = true;
      clearRetry();
    };
  }, [migrationRunnerDeps, refreshFromMemory]);

  const schemaUpdateHasErrored = bootstrapPhase === "migration_errored";

  const setPendingBoolean = useCallback(
    (column: UserSettingsBooleanColumnName, value: boolean) => {
      if (!shouldAllowPendingSettingsMutation(schemaUpdateHasErrored)) return;
      dispatchUi({ type: "set_pending_boolean", column, value });
    },
    [schemaUpdateHasErrored],
  );

  const setPendingInt = useCallback(
    (column: UserSettingsNumericColumnName, value: number) => {
      if (!shouldAllowPendingSettingsMutation(schemaUpdateHasErrored)) return;
      dispatchUi({ type: "set_pending_int", column, value });
    },
    [schemaUpdateHasErrored],
  );

  const savePendingChanges = useCallback(async () => {
    if (pendingSettings == null || schemaUpdateHasErrored) return;
    dispatchUi({ type: "save_start" });
    try {
      const db = getUserSettingsDb();
      await saveActiveUserSettingsToPersistentDb(db, pendingSettings);
      setActiveUserSettings(pendingSettings);
      refreshFromMemory();
      dispatchUi({ type: "save_success" });
    } finally {
      dispatchUi({ type: "save_end" });
    }
  }, [pendingSettings, refreshFromMemory, schemaUpdateHasErrored]);

  const openSettings = useCallback(() => {
    dispatchUi({
      type: "open",
      settings: cloneUserSettingsRow(getActiveUserSettings()),
    });
  }, []);

  const closeSettingsWithoutSave = useCallback(() => {
    dispatchUi({ type: "close_without_save" });
  }, []);

  const requestCloseSettings = useCallback(() => {
    const interaction = resolveSettingsCloseInteraction(
      hasEditedSettings,
      schemaUpdateHasErrored,
    );
    if (interaction.action === "close_immediately") {
      closeSettingsWithoutSave();
      return true;
    }
    return false;
  }, [closeSettingsWithoutSave, hasEditedSettings, schemaUpdateHasErrored]);

  const pushPage = useCallback((pageId: UserSettingsPageId) => {
    dispatchUi({ type: "push_page", pageId });
  }, []);

  const popPage = useCallback(() => {
    dispatchUi({ type: "pop_page" });
  }, []);

  const currentPageId = currentUserSettingsPageId(pageStack);

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      bootstrapPhase,
      schemaUpdateHasErrored,
      isOpen,
      pageStack,
      currentPageId,
      settings,
      pendingSettings,
      hasEditedSettings,
      isSaving,
      refreshFromMemory,
      setPendingBoolean,
      setPendingInt,
      savePendingChanges,
      openSettings,
      requestCloseSettings,
      closeSettingsWithoutSave,
      pushPage,
      popPage,
    }),
    [
      bootstrapPhase,
      closeSettingsWithoutSave,
      currentPageId,
      hasEditedSettings,
      isOpen,
      isSaving,
      openSettings,
      pageStack,
      pendingSettings,
      popPage,
      pushPage,
      refreshFromMemory,
      requestCloseSettings,
      savePendingChanges,
      schemaUpdateHasErrored,
      setPendingBoolean,
      setPendingInt,
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

export function useUserSettingsOrDefaults(): UserSettingsRow {
  const { settings } = useUserSettings();
  return settings ?? USER_SETTINGS_DEFAULTS;
}
