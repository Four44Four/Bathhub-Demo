import type { UserSettingsColumnName } from "./UserSettingsSchema";

export type UserSettingsBooleanItem = {
  type: "boolean";
  column: Extract<UserSettingsColumnName, "globe_movement_smooth">;
  label: string;
};

export type UserSettingsIntSliderItem = {
  type: "slider-int";
  column: Exclude<UserSettingsColumnName, "globe_movement_smooth">;
  label: string;
  min: number;
  max: number;
};

export type UserSettingsFloatSliderItem = {
  type: "slider-float";
  column: Exclude<UserSettingsColumnName, "globe_movement_smooth">;
  label: string;
  min: number;
  max: number;
};

export type UserSettingsSubpageItem = {
  type: "subpage";
  pageId: UserSettingsPageId;
  label: string;
};

export type UserSettingsPageItem =
  | UserSettingsBooleanItem
  | UserSettingsIntSliderItem
  | UserSettingsFloatSliderItem
  | UserSettingsSubpageItem;

/** Boolean setting columns referenced by page definitions. */
export type UserSettingsBooleanColumnName = UserSettingsBooleanItem["column"];

/** Numeric slider columns referenced by page definitions. */
export type UserSettingsNumericColumnName =
  | UserSettingsIntSliderItem["column"]
  | UserSettingsFloatSliderItem["column"];

export type UserSettingsPageId = "root" | "bathroom";

export type UserSettingsPageDefinition = {
  id: UserSettingsPageId;
  title: string;
  items: UserSettingsPageItem[];
};

export const USER_SETTINGS_ROOT_PAGE_ID = "root" as const;
export const USER_SETTINGS_BATHROOM_PAGE_ID = "bathroom" as const;

export const USER_SETTINGS_PAGES: Record<
  UserSettingsPageId,
  UserSettingsPageDefinition
> = {
  bathroom: {
    id: "bathroom",
    title: "Bathroom settings",
    items: [
      {
        type: "slider-int",
        column: "find_nearest_bathroom_max_dist_m",
        label: "Find nearest bathroom max. distance (meters)",
        min: 0,
        max: 10000,
      },
    ],
  },
  root: {
    id: "root",
    title: "Settings",
    items: [
      {
        type: "boolean",
        column: "globe_movement_smooth",
        label: "Globe movement smooth animations",
      },
      {
        type: "slider-int",
        column: "camera_init_surface_offset_m",
        label: "Init camera height (meters)",
        min: 500,
        max: 10000,
      },
      {
        type: "subpage",
        pageId: "bathroom",
        label: "Bathroom settings",
      },
    ],
  },
};
