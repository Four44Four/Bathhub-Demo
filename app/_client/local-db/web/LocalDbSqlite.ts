import {
  BATHROOM_LOCAL_CACHE_TABLE_NAME,
  type BathroomClientCacheEntry,
  type BathroomViewportEntry,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import { isCacheEntryExpired } from "../../pure/bathroom/CacheExpiration";
import { isLocalCacheSchemaReady } from "../../pure/bathroom/LocalCacheSchema";
import { isSqliteDatabaseBytes } from "../../pure/bathroom/SqliteDatabaseBytes";
import {
  decodeGpkgPointWgs84,
  encodeGpkgPointWgs84,
} from "../../pure/bathroom/GeoPackagePointGeometry";
import { type BathroomLocalDbPort } from "../LocalDbPort";
import {
  BATHROOM_LOCAL_DB_SCHEMA_SQL,
  RTREE_TABLE_NAME,
} from "./LocalDbSchema";

export type SqliteDb = {
  exec: (sql: string, opts?: { bind?: unknown[]; rowMode?: string }) => unknown;
  selectObjects: (
    sql: string,
    bind?: unknown[] | Record<string, unknown>,
  ) => Array<Record<string, unknown>>;
  pointer?: unknown;
};

export type SqliteWasm = {
  oo1: {
    DB: new (name: string, flags?: string) => SqliteDb;
  };
  capi: {
    sqlite3_deserialize: (
      db: unknown,
      schema: string,
      data: unknown,
      dbSize: number,
      bufferSize: number,
      flags: number,
    ) => number;
    sqlite3_js_db_export: (db: unknown, schema?: string) => Uint8Array;
    SQLITE_DESERIALIZE_READWRITE?: number;
    SQLITE_DESERIALIZE_RESIZEABLE?: number;
  };
  wasm: {
    allocFromTypedArray: (data: Uint8Array) => unknown;
    dealloc: (pointer: unknown) => void;
  };
};

export type BathroomLocalDbSqliteOptions = {
  cacheExpirationSecs: number;
  /** Called after cache mutations; used by the web demo for background disk backup. */
  onAfterMutate?: (db: SqliteDb, sqlite3: SqliteWasm) => void;
  /** Injectable clock for deterministic expiration tests. */
  now?: () => number;
  /** Optional on-disk snapshot to hydrate the in-memory DB on init. */
  hydrateFromBytes?: () => Promise<Uint8Array | null>;
  /** Called when on-disk bytes cannot be hydrated (corrupt or incomplete schema). */
  onInvalidHydrateBytes?: () => void | Promise<void>;
  /** Override sqlite-wasm bootstrap (integration tests use a Node-friendly loader). */
  initSqliteWasm?: () => Promise<SqliteWasm>;
};

function listTableNames(db: SqliteDb): string[] {
  const rows = db.selectObjects(
    `SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`,
  );
  return rows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === "string");
}

function ensureLocalCacheSchema(db: SqliteDb): void {
  if (isLocalCacheSchemaReady(listTableNames(db))) {
    return;
  }
  db.exec(BATHROOM_LOCAL_DB_SCHEMA_SQL);
}

export function loadGpkgBytesIntoMemoryDb(
  sqlite3: SqliteWasm,
  db: SqliteDb,
  bytes: Uint8Array,
): void {
  if (!db.pointer) {
    throw new Error("Bathroom local database pointer is unavailable.");
  }
  if (!isSqliteDatabaseBytes(bytes)) {
    throw new Error("Bathroom cache gpkg bytes are not a SQLite database.");
  }

  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  const resizeableFlag = sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE ?? 2;
  const rc = sqlite3.capi.sqlite3_deserialize(
    db.pointer,
    "main",
    pointer,
    bytes.byteLength,
    bytes.byteLength,
    resizeableFlag,
  );
  if (rc !== 0) {
    sqlite3.wasm.dealloc(pointer);
    throw new Error(`Failed to load bathroom cache gpkg (${rc}).`);
  }
  // sqlite-wasm keeps referencing this allocation for the DB lifetime; do not dealloc.
}

function upsertRtree(
  db: SqliteDb,
  remoteId: number,
  longitude: number,
  latitude: number,
): void {
  db.exec(`DELETE FROM ${RTREE_TABLE_NAME} WHERE remote_id = ?`, {
    bind: [remoteId],
  });
  db.exec(
    `INSERT INTO ${RTREE_TABLE_NAME} (remote_id, min_x, max_x, min_y, max_y)
     VALUES (?, ?, ?, ?, ?)`,
    { bind: [remoteId, longitude, longitude, latitude, latitude] },
  );
}

function deleteRtree(db: SqliteDb, remoteId: number): void {
  db.exec(`DELETE FROM ${RTREE_TABLE_NAME} WHERE remote_id = ?`, {
    bind: [remoteId],
  });
}

function evictOldestExpiredEntry(
  db: SqliteDb,
  expirationSecs: number,
  nowMs: number,
): void {
  const rows = db.selectObjects(
    `SELECT remote_id, updated_at
     FROM ${BATHROOM_LOCAL_CACHE_TABLE_NAME}
     ORDER BY updated_at ASC
     LIMIT 1`,
  );
  const oldest = rows[0];
  if (!oldest || typeof oldest.updated_at !== "string") return;

  const updatedAtMs = Date.parse(oldest.updated_at);
  if (
    !isCacheEntryExpired({ updatedAtMs }, nowMs, expirationSecs) ||
    typeof oldest.remote_id !== "number"
  ) {
    return;
  }

  db.exec(`DELETE FROM ${BATHROOM_LOCAL_CACHE_TABLE_NAME} WHERE remote_id = ?`, {
    bind: [oldest.remote_id],
  });
  deleteRtree(db, oldest.remote_id);
}

function coerceSqliteBlob(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function rowToViewportEntry(row: Record<string, unknown>): BathroomViewportEntry | null {
  const location = coerceSqliteBlob(row.location);
  if (
    typeof row.remote_id !== "number" ||
    typeof row.version !== "number" ||
    (row.verify_status !== "pending" && row.verify_status !== "verified") ||
    location === null
  ) {
    return null;
  }

  const { latitude, longitude } = decodeGpkgPointWgs84(location);
  return {
    id: row.remote_id,
    latitude,
    longitude,
    verify_status: row.verify_status,
    version: row.version,
  };
}

export function createBathroomLocalDbSqlite(
  options: BathroomLocalDbSqliteOptions,
): BathroomLocalDbPort & {
  /** Exposes the underlying DB for integration tests. */
  getSqliteDbForTests: () => Promise<SqliteDb>;
} {
  let db: SqliteDb | null = null;
  let sqlite3Module: SqliteWasm | null = null;
  let initPromise: Promise<void> | null = null;
  const now = options.now ?? (() => Date.now());

  const ensureDb = async (): Promise<{ db: SqliteDb; sqlite3: SqliteWasm }> => {
    if (initPromise) {
      await initPromise;
    }
    if (!db || !sqlite3Module) {
      throw new Error("Bathroom local database is not initialized.");
    }
    return { db, sqlite3: sqlite3Module };
  };

  const afterMutate = (activeDb: SqliteDb, sqlite3: SqliteWasm): void => {
    options.onAfterMutate?.(activeDb, sqlite3);
  };

  return {
    init(): Promise<void> {
      if (initPromise) return initPromise;

      initPromise = (async () => {
        try {
          const sqlite3 = options.initSqliteWasm
            ? await options.initSqliteWasm()
            : await (
                (await import("@sqlite.org/sqlite-wasm")).default as unknown as () => Promise<SqliteWasm>
              )();
          sqlite3Module = sqlite3;

          let memoryDb = new sqlite3.oo1.DB(":memory:");
          let hydratedFromDisk = false;

          const onDiskBytes = options.hydrateFromBytes
            ? await options.hydrateFromBytes()
            : null;
          if (onDiskBytes && isSqliteDatabaseBytes(onDiskBytes)) {
            try {
              loadGpkgBytesIntoMemoryDb(sqlite3, memoryDb, onDiskBytes);
              if (!isLocalCacheSchemaReady(listTableNames(memoryDb))) {
                throw new Error("Bathroom cache gpkg schema is incomplete.");
              }
              hydratedFromDisk = true;
            } catch {
              memoryDb = new sqlite3.oo1.DB(":memory:");
              await options.onInvalidHydrateBytes?.();
            }
          } else if (onDiskBytes) {
            await options.onInvalidHydrateBytes?.();
          }

          db = memoryDb;

          if (!hydratedFromDisk) {
            memoryDb.exec("PRAGMA journal_mode=WAL");
          }
          ensureLocalCacheSchema(memoryDb);
        } catch (error) {
          initPromise = null;
          db = null;
          sqlite3Module = null;
          throw error;
        }
      })();

      return initPromise;
    },

    async getInBounds(bounds: ViewportBounds): Promise<BathroomViewportEntry[]> {
      const { db: activeDb } = await ensureDb();
      const rows = activeDb.selectObjects(
        `SELECT c.remote_id, c.location, c.version, c.verify_status
         FROM ${BATHROOM_LOCAL_CACHE_TABLE_NAME} c
         INNER JOIN ${RTREE_TABLE_NAME} r ON c.remote_id = r.remote_id
         WHERE r.max_x >= ? AND r.min_x <= ? AND r.max_y >= ? AND r.min_y <= ?`,
        [
          bounds.lowerLeft.longitude,
          bounds.upperRight.longitude,
          bounds.lowerLeft.latitude,
          bounds.upperRight.latitude,
        ],
      );

      const entries: BathroomViewportEntry[] = [];
      for (const row of rows) {
        const entry = rowToViewportEntry(row);
        if (entry) entries.push(entry);
      }
      return entries;
    },

    async getIdVersionPairsInBounds(
      bounds: ViewportBounds,
    ): Promise<BathroomClientCacheEntry[]> {
      const { db: activeDb } = await ensureDb();
      const rows = activeDb.selectObjects(
        `SELECT c.remote_id, c.version
         FROM ${BATHROOM_LOCAL_CACHE_TABLE_NAME} c
         INNER JOIN ${RTREE_TABLE_NAME} r ON c.remote_id = r.remote_id
         WHERE r.max_x >= ? AND r.min_x <= ? AND r.max_y >= ? AND r.min_y <= ?`,
        [
          bounds.lowerLeft.longitude,
          bounds.upperRight.longitude,
          bounds.lowerLeft.latitude,
          bounds.upperRight.latitude,
        ],
      );

      return rows
        .filter(
          (row): row is { remote_id: number; version: number } =>
            typeof row.remote_id === "number" && typeof row.version === "number",
        )
        .map((row) => ({ id: row.remote_id, version: row.version }));
    },

    async upsertMany(entries: BathroomViewportEntry[]): Promise<void> {
      if (entries.length === 0) return;
      const { db: activeDb, sqlite3 } = await ensureDb();
      const nowMs = now();

      for (const entry of entries) {
        evictOldestExpiredEntry(
          activeDb,
          options.cacheExpirationSecs,
          nowMs,
        );

        const location = encodeGpkgPointWgs84(entry.longitude, entry.latitude);
        activeDb.exec(
          `INSERT INTO ${BATHROOM_LOCAL_CACHE_TABLE_NAME} (
             remote_id, location, version, verify_status, updated_at
           ) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
           ON CONFLICT(remote_id) DO UPDATE SET
             location = excluded.location,
             version = excluded.version,
             verify_status = excluded.verify_status,
             updated_at = excluded.updated_at`,
          {
            bind: [
              entry.id,
              location,
              entry.version,
              entry.verify_status,
            ],
          },
        );
        upsertRtree(activeDb, entry.id, entry.longitude, entry.latitude);
      }

      afterMutate(activeDb, sqlite3);
    },

    async deleteMany(ids: number[]): Promise<void> {
      if (ids.length === 0) return;
      const { db: activeDb, sqlite3 } = await ensureDb();

      for (const id of ids) {
        activeDb.exec(
          `DELETE FROM ${BATHROOM_LOCAL_CACHE_TABLE_NAME} WHERE remote_id = ?`,
          { bind: [id] },
        );
        deleteRtree(activeDb, id);
      }

      afterMutate(activeDb, sqlite3);
    },

    async getSqliteDbForTests(): Promise<SqliteDb> {
      const { db: activeDb } = await ensureDb();
      return activeDb;
    },
  };
}
