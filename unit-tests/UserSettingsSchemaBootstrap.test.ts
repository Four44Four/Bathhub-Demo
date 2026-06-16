import {
  resolveUserSettingsMigrationFromVersion,
  resolveUserSettingsSchemaBootstrapPhase,
  shouldLoadUserSettingsFromPersistentDb,
} from "../app/_shared/user-settings/UserSettingsSchemaBootstrap";

describe("resolveUserSettingsSchemaBootstrapPhase", () => {
  test("returns ready when versions match", () => {
    expect(resolveUserSettingsSchemaBootstrapPhase(1, 1, false)).toBe("ready");
  });

  test("returns schema_out_of_date when versions differ", () => {
    expect(resolveUserSettingsSchemaBootstrapPhase(0, 1, false)).toBe(
      "schema_out_of_date",
    );
  });

  test("returns migration_errored when migration has failed", () => {
    expect(resolveUserSettingsSchemaBootstrapPhase(1, 1, true)).toBe(
      "migration_errored",
    );
  });
});

describe("resolveUserSettingsMigrationFromVersion", () => {
  test("treats null persistent version as version 0", () => {
    expect(resolveUserSettingsMigrationFromVersion(null)).toBe(0);
  });
});

describe("shouldLoadUserSettingsFromPersistentDb", () => {
  test("loads only when versions match and migration has not errored", () => {
    expect(shouldLoadUserSettingsFromPersistentDb(1, 1, false)).toBe(true);
    expect(shouldLoadUserSettingsFromPersistentDb(0, 1, false)).toBe(false);
    expect(shouldLoadUserSettingsFromPersistentDb(1, 1, true)).toBe(false);
  });
});
