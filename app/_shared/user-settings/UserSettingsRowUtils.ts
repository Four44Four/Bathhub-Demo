import type { UserSettingsRow } from "./UserSettingsSchema";

export function cloneUserSettingsRow(row: UserSettingsRow): UserSettingsRow {
  return {
    globe_movement_smooth: row.globe_movement_smooth,
    camera_init_surface_offset_m: row.camera_init_surface_offset_m,
    show_non_verified_bathrooms_on_map: row.show_non_verified_bathrooms_on_map,
    show_pending_deletion_bathrooms_on_map:
      row.show_pending_deletion_bathrooms_on_map,
    find_nearest_bathroom_max_dist_m: row.find_nearest_bathroom_max_dist_m,
    find_nearest_bathroom_min_rating: row.find_nearest_bathroom_min_rating,
    find_nearest_bathroom_factor_non_verified:
      row.find_nearest_bathroom_factor_non_verified,
    find_nearest_bathroom_factor_pending_deletion:
      row.find_nearest_bathroom_factor_pending_deletion,
  };
}
