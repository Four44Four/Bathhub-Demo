import type { UserSettingsDbPort } from "../app/_client/user-settings-db/UserSettingsDbSqlite";
import {
  installInitialUserSettingsDbFromServer,
  type InstallInitialUserSettingsDbDeps,
} from "../app/_client/user-settings-db/installInitialUserSettingsDbFromServer";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";

function createMockDb(
  overrides: Partial<UserSettingsDbPort> = {},
): UserSettingsDbPort {
  return {
    init: jest.fn(async () => {}),
    getPersistentSchemaVersion: jest.fn(async () => null),
    readSettingsFromDb: jest.fn(async () => USER_SETTINGS_DEFAULTS),
    saveSettingsToDb: jest.fn(async () => {}),
    runForwardMigration: jest.fn(async () => {}),
    persistToDisk: jest.fn(async () => {}),
    hadLocalPersistentDbAtStartup: jest.fn(async () => false),
    replaceDbFromBytes: jest.fn(async () => {}),
    ...overrides,
  };
}

describe("installInitialUserSettingsDbFromServer", () => {
  test("installs the server snapshot when the client has no local DB", async () => {
    const db = createMockDb();
    const bytes = new Uint8Array([0x53, 0x51, 0x4c, 0x69]);
    const deps: InstallInitialUserSettingsDbDeps = {
      fetchDefaultDbBytes: jest.fn(async () => ({ ok: true, bytes })),
      isValidSqliteBytes: jest.fn(() => true),
    };

    const result = await installInitialUserSettingsDbFromServer(db, deps);

    expect(result).toEqual({ ok: true });
    expect(db.replaceDbFromBytes).toHaveBeenCalledWith(bytes);
    expect(db.persistToDisk).toHaveBeenCalled();
  });

  test("skips install when a local DB was already present", async () => {
    const db = createMockDb({
      hadLocalPersistentDbAtStartup: jest.fn(async () => true),
      getPersistentSchemaVersion: jest.fn(async () => null),
    });
    const deps: InstallInitialUserSettingsDbDeps = {
      fetchDefaultDbBytes: jest.fn(async () => ({
        ok: true,
        bytes: new Uint8Array([1, 2, 3]),
      })),
      isValidSqliteBytes: jest.fn(() => true),
    };

    const result = await installInitialUserSettingsDbFromServer(db, deps);

    expect(result).toEqual({ ok: false, reason: "not_applicable" });
    expect(deps.fetchDefaultDbBytes).not.toHaveBeenCalled();
  });

  test("reports rate-limit violations when the default DB fetch is denied", async () => {
    const db = createMockDb();
    const onRateLimitViolation = jest.fn();
    const deps: InstallInitialUserSettingsDbDeps = {
      fetchDefaultDbBytes: jest.fn(async () => ({
        ok: false,
        reason: "rate_limited",
        errorMsg:
          "Rate limit exceeded: default user settings database download is limited to 5 requests per minute.",
      })),
      isValidSqliteBytes: jest.fn(() => true),
      onRateLimitViolation,
    };

    const result = await installInitialUserSettingsDbFromServer(db, deps);

    expect(result).toEqual({ ok: false, reason: "fetch_failed" });
    expect(onRateLimitViolation).toHaveBeenCalledWith(
      "Rate limit exceeded: default user settings database download is limited to 5 requests per minute.",
    );
    expect(db.replaceDbFromBytes).not.toHaveBeenCalled();
  });
});
