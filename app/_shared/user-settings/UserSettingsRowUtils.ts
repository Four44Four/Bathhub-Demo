import type { UserSettingsRow } from "./UserSettingsSchema";

export function cloneUserSettingsRow(row: UserSettingsRow): UserSettingsRow {
  return {
    globe_movement_smooth: row.globe_movement_smooth,
    camera_init_surface_offset_m: row.camera_init_surface_offset_m,
    find_nearest_bathroom_max_dist_m: row.find_nearest_bathroom_max_dist_m,
  };
}
