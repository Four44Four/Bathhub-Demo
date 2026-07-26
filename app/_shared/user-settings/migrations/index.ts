import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";
import { USER_SETTINGS_MIGRATION_V0_TO_V1 } from "./v0-to-v1";
import { USER_SETTINGS_MIGRATION_V1_TO_V2 } from "./v1-to-v2";
import { USER_SETTINGS_MIGRATION_V2_TO_V3 } from "./v2-to-v3";
import { USER_SETTINGS_MIGRATION_V3_TO_V4 } from "./v3-to-v4";

/** Indexed by the version being migrated **from** (0 → scripts for 0→1). */
export const USER_SETTINGS_SCHEMA_MIGRATIONS: ReadonlyArray<
  UserSettingsSchemaMigrationScripts | undefined
> = [
  USER_SETTINGS_MIGRATION_V0_TO_V1,
  USER_SETTINGS_MIGRATION_V1_TO_V2,
  USER_SETTINGS_MIGRATION_V2_TO_V3,
  USER_SETTINGS_MIGRATION_V3_TO_V4,
];
