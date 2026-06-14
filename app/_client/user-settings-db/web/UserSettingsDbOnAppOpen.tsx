"use client";

import { useEffect } from "react";

import * as ServerDebug from "@/app/_server/Debug";
import { formatUserSettingsSchemaVersionMismatchMessage } from "@/app/_shared/user-settings/UserSettingsSchemaMigration";
import { USER_SETTINGS_FRONTEND_SCHEMA_VERSION } from "../../user-settings/UserSettingsSchemaVersion";
import { getUserSettingsDb } from "./UserSettingsDbWeb";

/**
 * Web demo: initializes the user-settings SQLite DB on visit and logs when the
 * persistent schema version disagrees with the hardcoded frontend version.
 */
export function UserSettingsDbOnAppOpen() {
  useEffect(() => {
    void (async () => {
      const db = getUserSettingsDb();
      await db.init();
      const persistentVersion = await db.getPersistentSchemaVersion();
      if (
        persistentVersion != null &&
        persistentVersion !== USER_SETTINGS_FRONTEND_SCHEMA_VERSION
      ) {
        const message = formatUserSettingsSchemaVersionMismatchMessage(
          persistentVersion,
          USER_SETTINGS_FRONTEND_SCHEMA_VERSION,
        );
        console.log(message);
        void ServerDebug.log(message);
      }
    })();
  }, []);

  return null;
}
