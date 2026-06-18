import {
  buildAndValidateDefaultUserSettingsDbSnapshot,
} from "../app/_shared/user-settings/buildDefaultUserSettingsDbSnapshot";
import { readDefaultUserSettingsDbSnapshotBytes } from "../app/_server/user-settings/readDefaultUserSettingsDbSnapshot";
import {
  loadUserSettingsBytesIntoMemoryDb,
  isUserSettingsSchemaReady,
} from "../app/_client/user-settings-db/UserSettingsDbSqlite";
import { USER_SETTINGS_MAX_SCHEMA_VERSION } from "../app/_shared/user-settings/UserSettingsSchema";
import type { SqliteWasm } from "../app/_client/local-db/web/LocalDbSqlite";
import {
  buildDefaultUserSettingsDbSnapshotFile,
  createDefaultUserSettingsDbSnapshotReader,
} from "./defaultUserSettingsDbSnapshotHelpers";

const { loadSqliteWasmModule } = require("./sqliteWasmLoader.cjs") as {
  loadSqliteWasmModule: () => Promise<SqliteWasm>;
};

function listTableNames(db: { selectObjects: (sql: string) => Array<{ name?: unknown }> }): string[] {
  const rows = db.selectObjects(
    `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`,
  );
  return rows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === "string");
}

describe("Default user settings DB snapshot (user_settings spec §118–127)", () => {
  test("cumulative migrations produce a valid default DB snapshot", async () => {
    const sqlite3 = await loadSqliteWasmModule();
    const db = new sqlite3.oo1.DB(":memory:");
    const validation = buildAndValidateDefaultUserSettingsDbSnapshot(
      createDefaultUserSettingsDbSnapshotReader(db),
    );
    expect(validation).toEqual({ ok: true });
    expect(isUserSettingsSchemaReady(listTableNames(db))).toBe(true);
  });

  test("checked-in server snapshot matches cumulative migration output", async () => {
    await buildDefaultUserSettingsDbSnapshotFile();
    const snapshotBytes = await readDefaultUserSettingsDbSnapshotBytes();
    const sqlite3 = await loadSqliteWasmModule();
    const db = new sqlite3.oo1.DB(":memory:");
    loadUserSettingsBytesIntoMemoryDb(sqlite3, db, snapshotBytes);

    const validation = buildAndValidateDefaultUserSettingsDbSnapshot(
      createDefaultUserSettingsDbSnapshotReader(db),
      USER_SETTINGS_MAX_SCHEMA_VERSION,
    );
    expect(validation).toEqual({ ok: true });
  });
});
