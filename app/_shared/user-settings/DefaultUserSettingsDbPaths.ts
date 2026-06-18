export const DEFAULT_USER_SETTINGS_DB_SNAPSHOT_DIR =
  "app/_server/user-settings/snapshot" as const;

export const DEFAULT_USER_SETTINGS_DB_SNAPSHOT_FILENAME =
  "default-user-settings.sqlite" as const;

export const DEFAULT_USER_SETTINGS_DB_SNAPSHOT_RELATIVE_PATH =
  `${DEFAULT_USER_SETTINGS_DB_SNAPSHOT_DIR}/${DEFAULT_USER_SETTINGS_DB_SNAPSHOT_FILENAME}` as const;

export const USER_SETTINGS_DEFAULT_DB_API_PATH =
  "/api/user-settings/default-db" as const;
