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

export type UserSettingsSubpageItem = {
  type: "subpage";
  pageId: UserSettingsPageId;
  label: string;
};

export type UserSettingsPageItem =
  | UserSettingsBooleanItem
  | UserSettingsIntSliderItem
  | UserSettingsSubpageItem;

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
    ],
  },
  bathroom: {
    id: "bathroom",
    title: "Bathroom settings",
    items: [],
  },
};
