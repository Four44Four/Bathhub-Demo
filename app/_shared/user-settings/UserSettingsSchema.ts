/** Maximum user-settings schema version the server can migrate up to. */
export const USER_SETTINGS_MAX_SCHEMA_VERSION = 2;

export const USER_SETTINGS_SCHEMA_VERSION_META_KEY = "SCHEMA_VERSION";

export const USER_SETTINGS_TABLE_NAME = "user_settings";
export const USER_SETTINGS_META_TABLE_NAME = "user_settings_meta";

export type UserSettingsColumnName =
  | "globe_movement_smooth"
  | "camera_init_surface_offset_m"
  | "find_nearest_bathroom_max_dist_m"
  | "find_nearest_bathroom_min_rating";

export type UserSettingsRow = {
  globe_movement_smooth: boolean;
  camera_init_surface_offset_m: number;
  find_nearest_bathroom_max_dist_m: number;
  find_nearest_bathroom_min_rating: number;
};

/** User settings row shape at schema version 1 (before min rating was added). */
export type UserSettingsRowSchemaV1 = Pick<
  UserSettingsRow,
  | "globe_movement_smooth"
  | "camera_init_surface_offset_m"
  | "find_nearest_bathroom_max_dist_m"
>;

export const USER_SETTINGS_DEFAULTS: UserSettingsRow = {
  globe_movement_smooth: true,
  camera_init_surface_offset_m: 1500,
  find_nearest_bathroom_max_dist_m: 5000,
  find_nearest_bathroom_min_rating: 0,
};
