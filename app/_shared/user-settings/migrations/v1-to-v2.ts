import {
  USER_SETTINGS_DEFAULTS,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRow,
} from "../UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";

/** Defaults snapshotted for schema version 2 (target of the 1→2 migration). */
export const USER_SETTINGS_MIGRATION_V1_TO_V2_DEFAULTS: UserSettingsRow = {
  ...USER_SETTINGS_DEFAULTS,
};

const { find_nearest_bathroom_min_rating } =
  USER_SETTINGS_MIGRATION_V1_TO_V2_DEFAULTS;

/** Version 1 → 2: add find_nearest_bathroom_min_rating column. */
export const USER_SETTINGS_MIGRATION_V1_TO_V2: UserSettingsSchemaMigrationScripts =
  {
    defaults: USER_SETTINGS_MIGRATION_V1_TO_V2_DEFAULTS,
    forwardSql: [
      `ALTER TABLE ${USER_SETTINGS_TABLE_NAME}
ADD COLUMN find_nearest_bathroom_min_rating REAL NOT NULL DEFAULT ${find_nearest_bathroom_min_rating} CHECK (
  find_nearest_bathroom_min_rating >= 0.0 AND find_nearest_bathroom_min_rating <= 5.0
);`,
      `UPDATE user_settings_meta
SET value = '2'
WHERE key = '${USER_SETTINGS_SCHEMA_VERSION_META_KEY}';`,
    ],
  };
