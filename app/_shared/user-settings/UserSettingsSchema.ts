/** Maximum user-settings schema version the server can migrate up to. */
export const USER_SETTINGS_MAX_SCHEMA_VERSION = 4;

export const USER_SETTINGS_SCHEMA_VERSION_META_KEY = "SCHEMA_VERSION";

export const USER_SETTINGS_TABLE_NAME = "user_settings";
export const USER_SETTINGS_META_TABLE_NAME = "user_settings_meta";

export type UserSettingsBooleanColumnName =
  | "globe_movement_smooth"
  | "show_non_verified_bathrooms_on_map"
  | "show_pending_deletion_bathrooms_on_map"
  | "find_nearest_bathroom_factor_non_verified"
  | "find_nearest_bathroom_factor_pending_deletion";

export type UserSettingsColumnName =
  | UserSettingsBooleanColumnName
  | "camera_init_surface_offset_m"
  | "find_nearest_bathroom_max_dist_m"
  | "find_nearest_bathroom_min_rating";

export type UserSettingsRow = {
  globe_movement_smooth: boolean;
  camera_init_surface_offset_m: number;
  show_non_verified_bathrooms_on_map: boolean;
  show_pending_deletion_bathrooms_on_map: boolean;
  find_nearest_bathroom_max_dist_m: number;
  find_nearest_bathroom_min_rating: number;
  find_nearest_bathroom_factor_non_verified: boolean;
  find_nearest_bathroom_factor_pending_deletion: boolean;
};

/** User settings row shape at schema version 3 (before find-nearest factor settings). */
export type UserSettingsRowSchemaV3 = Pick<
  UserSettingsRow,
  | "globe_movement_smooth"
  | "camera_init_surface_offset_m"
  | "show_non_verified_bathrooms_on_map"
  | "show_pending_deletion_bathrooms_on_map"
  | "find_nearest_bathroom_max_dist_m"
  | "find_nearest_bathroom_min_rating"
>;

/** User settings row shape at schema version 1 (before min rating was added). */
export type UserSettingsRowSchemaV1 = Pick<
  UserSettingsRow,
  | "globe_movement_smooth"
  | "camera_init_surface_offset_m"
  | "find_nearest_bathroom_max_dist_m"
>;

/** User settings row shape at schema version 2 (before map visibility settings were added). */
export type UserSettingsRowSchemaV2 = Pick<
  UserSettingsRow,
  | "globe_movement_smooth"
  | "camera_init_surface_offset_m"
  | "find_nearest_bathroom_max_dist_m"
  | "find_nearest_bathroom_min_rating"
>;

export const USER_SETTINGS_DEFAULTS: UserSettingsRow = {
  globe_movement_smooth: true,
  camera_init_surface_offset_m: 1500,
  show_non_verified_bathrooms_on_map: true,
  show_pending_deletion_bathrooms_on_map: true,
  find_nearest_bathroom_max_dist_m: 5000,
  find_nearest_bathroom_min_rating: 2.5,
  find_nearest_bathroom_factor_non_verified: true,
  find_nearest_bathroom_factor_pending_deletion: false,
};
