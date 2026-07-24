import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAndValidateDefaultUserSettingsDbSnapshot,
} from "../app/_shared/user-settings/buildDefaultUserSettingsDbSnapshot";
import {
  DEFAULT_USER_SETTINGS_DB_SNAPSHOT_DIR,
  DEFAULT_USER_SETTINGS_DB_SNAPSHOT_FILENAME,
} from "../app/_shared/user-settings/DefaultUserSettingsDbPaths";
import {
  USER_SETTINGS_META_TABLE_NAME,
  USER_SETTINGS_SCHEMA_VERSION_META_KEY,
  USER_SETTINGS_TABLE_NAME,
} from "../app/_shared/user-settings/UserSettingsSchema";
import type { SqliteDb, SqliteWasm } from "../app/_client/local-db/web/LocalDbSqlite";

const { loadSqliteWasmModule } = require("./sqliteWasmLoader.cjs") as {
  loadSqliteWasmModule: () => Promise<SqliteWasm>;
};

export function createDefaultUserSettingsDbSnapshotReader(db: SqliteDb) {
  return {
    exec: (sql: string) => {
      db.exec(sql);
    },
    readSchemaVersion: () => {
      const rows = db.selectObjects(
        `SELECT value FROM ${USER_SETTINGS_META_TABLE_NAME} WHERE key = ?`,
        [USER_SETTINGS_SCHEMA_VERSION_META_KEY],
      );
      const raw = rows[0]?.value;
      if (typeof raw !== "string") return null;
      const parsed = Number.parseInt(raw, 10);
      return Number.isInteger(parsed) ? parsed : null;
    },
    readSettings: () => {
      const rows = db.selectObjects(
        `SELECT
          globe_movement_smooth,
          camera_init_surface_offset_m,
          find_nearest_bathroom_max_dist_m
        FROM ${USER_SETTINGS_TABLE_NAME}
        WHERE id = 1`,
      );
      if (rows.length === 0) {
        throw new Error("Default user settings row is missing.");
      }
      const row = rows[0]!;
      return {
        globe_movement_smooth: row.globe_movement_smooth === 1,
        camera_init_surface_offset_m: Number(row.camera_init_surface_offset_m),
        find_nearest_bathroom_max_dist_m: Number(
          row.find_nearest_bathroom_max_dist_m,
        ),
      };
    },
  };
}

export async function buildDefaultUserSettingsDbSnapshotBytes(): Promise<Uint8Array> {
  const sqlite3 = await loadSqliteWasmModule();
  const db = new sqlite3.oo1.DB(":memory:");
  const validation = buildAndValidateDefaultUserSettingsDbSnapshot(
    createDefaultUserSettingsDbSnapshotReader(db),
  );
  if (!validation.ok) {
    throw new Error(
      `Default user settings DB snapshot validation failed: ${validation.reason}`,
    );
  }

  return sqlite3.capi.sqlite3_js_db_export(db);
}

export async function buildDefaultUserSettingsDbSnapshotFile(
  workspaceRoot: string = path.resolve(__dirname, ".."),
): Promise<Uint8Array> {
  const bytes = await buildDefaultUserSettingsDbSnapshotBytes();
  const snapshotDir = path.join(workspaceRoot, DEFAULT_USER_SETTINGS_DB_SNAPSHOT_DIR);
  await mkdir(snapshotDir, { recursive: true });
  await writeFile(
    path.join(snapshotDir, DEFAULT_USER_SETTINGS_DB_SNAPSHOT_FILENAME),
    Buffer.from(bytes),
  );
  return bytes;
}
