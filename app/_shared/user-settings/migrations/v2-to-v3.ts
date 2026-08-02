import {
  USER_SETTINGS_DEFAULTS,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRowSchemaV3,
} from "../UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";

/** Defaults snapshotted for schema version 3 (target of the 2→3 migration). */
export const USER_SETTINGS_MIGRATION_V2_TO_V3_DEFAULTS: UserSettingsRowSchemaV3 =
  {
    globe_movement_smooth: USER_SETTINGS_DEFAULTS.globe_movement_smooth,
    camera_init_surface_offset_m:
      USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m,
    show_non_verified_bathrooms_on_map:
      USER_SETTINGS_DEFAULTS.show_non_verified_bathrooms_on_map,
    show_pending_deletion_bathrooms_on_map:
      USER_SETTINGS_DEFAULTS.show_pending_deletion_bathrooms_on_map,
    find_nearest_bathroom_max_dist_m:
      USER_SETTINGS_DEFAULTS.find_nearest_bathroom_max_dist_m,
    find_nearest_bathroom_min_rating:
      USER_SETTINGS_DEFAULTS.find_nearest_bathroom_min_rating,
  };

const {
  show_non_verified_bathrooms_on_map,
  show_pending_deletion_bathrooms_on_map,
} = USER_SETTINGS_MIGRATION_V2_TO_V3_DEFAULTS;

const showNonVerifiedSql = show_non_verified_bathrooms_on_map ? 1 : 0;
const showPendingDeletionSql = show_pending_deletion_bathrooms_on_map ? 1 : 0;

/** Version 2 → 3: add bathroom map visibility boolean columns. */
export const USER_SETTINGS_MIGRATION_V2_TO_V3: UserSettingsSchemaMigrationScripts =
  {
    defaults: USER_SETTINGS_MIGRATION_V2_TO_V3_DEFAULTS,
    forwardSql: [
      `ALTER TABLE ${USER_SETTINGS_TABLE_NAME}
ADD COLUMN show_non_verified_bathrooms_on_map INTEGER NOT NULL DEFAULT ${showNonVerifiedSql} CHECK (
  show_non_verified_bathrooms_on_map IN (0, 1)
);`,
      `ALTER TABLE ${USER_SETTINGS_TABLE_NAME}
ADD COLUMN show_pending_deletion_bathrooms_on_map INTEGER NOT NULL DEFAULT ${showPendingDeletionSql} CHECK (
  show_pending_deletion_bathrooms_on_map IN (0, 1)
);`,
      `UPDATE user_settings_meta
SET value = '3'
WHERE key = '${USER_SETTINGS_SCHEMA_VERSION_META_KEY}';`,
    ],
  };
