import {
  USER_SETTINGS_DEFAULTS,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRow,
} from "../UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";

/** Defaults snapshotted for schema version 4 (target of the 3→4 migration). */
export const USER_SETTINGS_MIGRATION_V3_TO_V4_DEFAULTS: UserSettingsRow = {
  ...USER_SETTINGS_DEFAULTS,
};

const {
  find_nearest_bathroom_factor_non_verified,
  find_nearest_bathroom_factor_pending_deletion,
} = USER_SETTINGS_MIGRATION_V3_TO_V4_DEFAULTS;

const factorNonVerifiedSql = find_nearest_bathroom_factor_non_verified ? 1 : 0;
const factorPendingDeletionSql = find_nearest_bathroom_factor_pending_deletion
  ? 1
  : 0;

/** Version 3 → 4: add find-nearest bathroom factor boolean columns. */
export const USER_SETTINGS_MIGRATION_V3_TO_V4: UserSettingsSchemaMigrationScripts =
  {
    defaults: USER_SETTINGS_MIGRATION_V3_TO_V4_DEFAULTS,
    forwardSql: [
      `ALTER TABLE ${USER_SETTINGS_TABLE_NAME}
ADD COLUMN find_nearest_bathroom_factor_non_verified INTEGER NOT NULL DEFAULT ${factorNonVerifiedSql} CHECK (
  find_nearest_bathroom_factor_non_verified IN (0, 1)
);`,
      `ALTER TABLE ${USER_SETTINGS_TABLE_NAME}
ADD COLUMN find_nearest_bathroom_factor_pending_deletion INTEGER NOT NULL DEFAULT ${factorPendingDeletionSql} CHECK (
  find_nearest_bathroom_factor_pending_deletion IN (0, 1)
);`,
      `UPDATE user_settings_meta
SET value = '4'
WHERE key = '${USER_SETTINGS_SCHEMA_VERSION_META_KEY}';`,
    ],
  };
