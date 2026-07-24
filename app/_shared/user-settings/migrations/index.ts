import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";
import { USER_SETTINGS_MIGRATION_V0_TO_V1 } from "./v0-to-v1";
import { USER_SETTINGS_MIGRATION_V1_TO_V2 } from "./v1-to-v2";

/** Indexed by the version being migrated **from** (0 → scripts for 0→1). */
export const USER_SETTINGS_SCHEMA_MIGRATIONS: ReadonlyArray<
  UserSettingsSchemaMigrationScripts | undefined
> = [USER_SETTINGS_MIGRATION_V0_TO_V1, USER_SETTINGS_MIGRATION_V1_TO_V2];
