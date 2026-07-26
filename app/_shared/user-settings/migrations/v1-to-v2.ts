import {
  USER_SETTINGS_DEFAULTS,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRowSchemaV2,
} from "../UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";

/** Defaults snapshotted for schema version 2 (target of the 1→2 migration). */
export const USER_SETTINGS_MIGRATION_V1_TO_V2_DEFAULTS: UserSettingsRowSchemaV2 = {
  globe_movement_smooth: USER_SETTINGS_DEFAULTS.globe_movement_smooth,
  camera_init_surface_offset_m: USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m,
  find_nearest_bathroom_max_dist_m:
    USER_SETTINGS_DEFAULTS.find_nearest_bathroom_max_dist_m,
  find_nearest_bathroom_min_rating:
    USER_SETTINGS_DEFAULTS.find_nearest_bathroom_min_rating,
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
