import {
  USER_SETTINGS_META_TABLE_NAME,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
  type UserSettingsRowSchemaV1,
} from "../UserSettingsSchema";
import type { UserSettingsSchemaMigrationScripts } from "../UserSettingsSchemaMigration";

/** Defaults snapshotted for schema version 1 (target of the 0→1 migration). */
export const USER_SETTINGS_MIGRATION_V0_TO_V1_DEFAULTS: UserSettingsRowSchemaV1 = {
  globe_movement_smooth: true,
  camera_init_surface_offset_m: 1500,
  find_nearest_bathroom_max_dist_m: 5000,
};

const {
  globe_movement_smooth,
  camera_init_surface_offset_m,
  find_nearest_bathroom_max_dist_m,
} = USER_SETTINGS_MIGRATION_V0_TO_V1_DEFAULTS;

const globeMovementSmoothSql = globe_movement_smooth ? 1 : 0;

/** Version 0 → 1: create meta + user_settings tables and seed defaults. */
export const USER_SETTINGS_MIGRATION_V0_TO_V1: UserSettingsSchemaMigrationScripts = {
  defaults: USER_SETTINGS_MIGRATION_V0_TO_V1_DEFAULTS,
  forwardSql: [
    `CREATE TABLE ${USER_SETTINGS_META_TABLE_NAME} (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);`,
    `CREATE TABLE ${USER_SETTINGS_TABLE_NAME} (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  globe_movement_smooth INTEGER NOT NULL CHECK (globe_movement_smooth IN (0, 1)),
  camera_init_surface_offset_m INTEGER NOT NULL CHECK (
    camera_init_surface_offset_m >= 500 AND camera_init_surface_offset_m <= 10000
  ),
  find_nearest_bathroom_max_dist_m INTEGER NOT NULL CHECK (
    find_nearest_bathroom_max_dist_m >= 0 AND find_nearest_bathroom_max_dist_m <= 10000
  )
);`,
    `INSERT INTO ${USER_SETTINGS_TABLE_NAME} (
  id,
  globe_movement_smooth,
  camera_init_surface_offset_m,
  find_nearest_bathroom_max_dist_m
) VALUES (
  1,
  ${globeMovementSmoothSql},
  ${camera_init_surface_offset_m},
  ${find_nearest_bathroom_max_dist_m}
);`,
    `INSERT INTO ${USER_SETTINGS_META_TABLE_NAME} (key, value)
VALUES ('${USER_SETTINGS_SCHEMA_VERSION_META_KEY}', '1');`,
  ],
};

