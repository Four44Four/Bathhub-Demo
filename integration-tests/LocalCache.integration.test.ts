import { createClient } from "@supabase/supabase-js";

import {
  createAt as bathroomDbCreate,
  getInBounds as bathroomDbReadInBounds,
  syncInBounds as bathroomDbSyncInBounds,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import { getReadCache } from "../app/_server/redis/ReadCache";
import {
  BATHROOM_LOCAL_CACHE_TABLE_NAME,
  type BathroomClientCacheEntry,
  type BathroomDataPrimaryRow,
  type BathroomSyncResponse,
  type BathroomViewportEntry,
  type ViewportBounds,
} from "../app/_shared/BathroomDataPrimary";
import {
  BathroomLocalDB,
  BathroomMapMarker,
  BathroomRemoteDB,
} from "../app/_client/ComponentConstants";
import { type Errorable } from "../app/_shared/Utils";
import { installBathroomMarkers } from "../app/_client/globe/BathroomMarkers";
import { bathroomMarkerBillboardTint } from "../app/_client/pure/bathroom/BathroomMarkerTint";
import { isLocalCacheSchemaReady } from "../app/_client/pure/bathroom/LocalCacheSchema";
import { remoteSyncStarted } from "../app/_client/pure/bathroom/BathroomViewportRemoteGate";
import {
  createBathroomLocalDbSqlite,
  loadGpkgBytesIntoMemoryDb,
} from "../app/_client/local-db/web/LocalDbSqlite";
import {
  createRenderedBathroomMap,
  type RenderedBathroomEntry,
  type RenderedBathroomMap,
} from "../app/_client/pure/bathroom/RenderedBathrooms";
import { type BathroomMarkersSyncContext } from "../app/_client/globe/BathroomMarkers";
import { runBathroomViewportSyncForGlobe } from "../app/_client/bathroom/BathroomViewportSync";
import {
  boundsAround,
  completedRemoteGate,
  expectClientCacheEntry,
  expectViewportEntryMatchesRow,
  findSeededRow,
  idleRemoteGate,
  nearlyEqual,
  runViewportCacheSync,
  runViewportLocalCacheSync,
  runViewportRemoteCacheSync,
  simulateRemoteGateRetry,
  setBathroomVersion,
  WORLD_BOUNDS,
} from "./integrationHelpers";
import { loadLocations } from "./loadLocations";
import {
  requireLocalSupabaseAdminEnv,
  type LocalSupabaseAdminEnv,
} from "./requireLocalSupabase";

const { loadSqliteWasmModule } = require("./sqliteWasmLoader.cjs") as {
  loadSqliteWasmModule: () => Promise<import("../app/_client/local-db/web/LocalDbSqlite").SqliteWasm>;
};

const READ_IN_BOUNDS_ERROR_CONTEXT =
  "Failed to list bathroom_data_primary rows in bounds" as const;

const CACHE_TEST_LOCATIONS = {
  emptyCache: "paris",
  warmCache: "london",
  staleVersion: "tokyo",
  outOfBounds: "nyc",
  deletePhantom: "paris",
} as const;

function createTestLocalDb(nowMs?: number) {
  return createBathroomLocalDbSqlite({
    cacheExpirationSecs: BathroomLocalDB.CACHE_EXPIRATION_SECS,
    initSqliteWasm: loadSqliteWasmModule,
    now: nowMs === undefined ? undefined : () => nowMs,
  });
}

async function setCacheUpdatedAt(
  localDb: ReturnType<typeof createTestLocalDb>,
  remoteId: number,
  updatedAtIso: string,
): Promise<void> {
  const db = await localDb.getSqliteDbForTests();
  db.exec(
    `UPDATE ${BATHROOM_LOCAL_CACHE_TABLE_NAME} SET updated_at = ? WHERE remote_id = ?`,
    { bind: [updatedAtIso, remoteId] },
  );
}

function renderedIds(rendered: Map<number, BathroomViewportEntry>): number[] {
  return Array.from(rendered.keys()).sort((a, b) => a - b);
}

type MockCesiumEntity = {
  name?: string;
  show?: boolean;
  billboard?: {
    image?: string;
    color?: { value?: { css?: string; alpha?: number } };
  };
};

function createBathroomMarkerHarness() {
  const entities: MockCesiumEntity[] = [];
  const removedEntities: MockCesiumEntity[] = [];
  const requestRender = jest.fn();

  class ConstantProperty {
    value: unknown;
    constructor(value: unknown) {
      this.value = value;
    }
    setValue(value: unknown): void {
      this.value = value;
    }
  }

  class ConstantPositionProperty {
    value: unknown;
    constructor(value: unknown) {
      this.value = value;
    }
    setValue(value: unknown): void {
      this.value = value;
    }
  }

  class Cartesian3 {
    x = 0;
    y = 0;
    z = 0;
    static fromRadians(
      lonRad: number,
      latRad: number,
      height: number,
      _ellipsoid: unknown,
      result: Cartesian3,
    ): Cartesian3 {
      result.x = lonRad;
      result.y = latRad;
      result.z = height;
      return result;
    }
  }

  const Cesium = {
    HorizontalOrigin: { CENTER: "CENTER" },
    VerticalOrigin: { CENTER: "CENTER", BOTTOM: "BOTTOM" },
    ConstantProperty,
    ConstantPositionProperty,
    Cartesian3,
    Math: {
      toRadians: (degrees: number) => (degrees * Math.PI) / 180,
    },
    Color: {
      fromCssColorString: (css: string) => ({
        withAlpha: (alpha: number) => ({ css, alpha }),
      }),
    },
  } as unknown as typeof import("cesium");

  const viewer = {
    scene: {
      requestRender,
      globe: {
        ellipsoid: {},
      },
    },
    entities: {
      add: (entity: MockCesiumEntity) => {
        entities.push(entity);
        return entity;
      },
      remove: (entity: MockCesiumEntity) => {
        const index = entities.indexOf(entity);
        if (index < 0) return false;
        const [removed] = entities.splice(index, 1);
        if (removed) removedEntities.push(removed);
        return true;
      },
    },
  } as unknown as import("cesium").Viewer;

  return {
    Cesium,
    viewer,
    entities,
    removedEntities,
    requestRender,
  };
}

describe("bathroom local SQLite cache sync against local Supabase", () => {
  const locations = loadLocations();
  const createdFixtureIds: number[] = [];
  const originalVersions = new Map<number, number>();
  let seededRows: BathroomDataPrimaryRow[] = [];
  let adminEnv: LocalSupabaseAdminEnv | null = null;

  beforeAll(async () => {
    adminEnv = requireLocalSupabaseAdminEnv();
    seededRows = await bathroomDbReadInBounds(WORLD_BOUNDS);

    for (const location of locations) {
      const existing = seededRows.find(
        (row) =>
          nearlyEqual(row.latitude, location.latitude) &&
          nearlyEqual(row.longitude, location.longitude),
      );
      if (existing !== undefined) {
        continue;
      }

      const created = await bathroomDbCreate(
        location.latitude,
        location.longitude,
      );
      createdFixtureIds.push(created.id);
      seededRows.push(created);
    }
  });

  afterAll(async () => {
    for (const [id, version] of originalVersions) {
      if (!createdFixtureIds.includes(id)) {
        await setBathroomVersion(id, version);
      }
    }

    const affectedIds = new Set([
      ...createdFixtureIds,
      ...originalVersions.keys(),
    ]);
    const readCache = getReadCache();
    await Promise.all(
      Array.from(affectedIds, (id) => readCache.removeBathroom(id)),
    );

    if (createdFixtureIds.length > 0 && adminEnv !== null) {
      const admin = createClient(adminEnv.url, adminEnv.serviceRoleKey);
      const { error } = await admin
        .from("bathroom_data_primary")
        .delete()
        .in("id", createdFixtureIds);
      if (error !== null) {
        throw new Error(`Failed to clean local cache fixtures: ${error.message}`);
      }
    }
  });

  test("hydrates in-memory cache from exported sqlite bytes after app restart", async () => {
    const row = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.warmCache,
    );
    const bounds = boundsAround(row.latitude, row.longitude);
    const localDb = createTestLocalDb();

    await runViewportCacheSync(localDb, bounds);
    const sqlite3 = await loadSqliteWasmModule();
    const db = await localDb.getSqliteDbForTests();
    const exportedBytes = sqlite3.capi.sqlite3_js_db_export(db);

    const restartedDb = createBathroomLocalDbSqlite({
      cacheExpirationSecs: BathroomLocalDB.CACHE_EXPIRATION_SECS,
      initSqliteWasm: loadSqliteWasmModule,
      hydrateFromBytes: async () => exportedBytes,
    });
    await restartedDb.init();

    const cached = await restartedDb.getInBounds(bounds);
    expect(cached).toHaveLength(1);
    expectViewportEntryMatchesRow(cached[0], row);
  });

  test("loadGpkgBytesIntoMemoryDb supports PRAGMA after deserialize", async () => {
    const sqlite3 = await loadSqliteWasmModule();
    const sourceDb = new sqlite3.oo1.DB(":memory:");
    sourceDb.exec("CREATE TABLE t(x INTEGER)");
    sourceDb.exec("INSERT INTO t VALUES (7)");
    const bytes = sqlite3.capi.sqlite3_js_db_export(sourceDb);

    const targetDb = new sqlite3.oo1.DB(":memory:");
    loadGpkgBytesIntoMemoryDb(sqlite3, targetDb, bytes);
    targetDb.exec("PRAGMA journal_mode=WAL");

    const rows = targetDb.selectObjects("SELECT x FROM t");
    expect(rows[0]?.x).toBe(7);
  });

  test("init creates required GeoPackage and cache tables on first open", async () => {
    const localDb = createTestLocalDb();
    await localDb.init();

    const db = await localDb.getSqliteDbForTests();
    const tableNames = db
      .selectObjects(`SELECT name FROM sqlite_master WHERE type IN ('table', 'view')`)
      .map((row) => row.name)
      .filter((name): name is string => typeof name === "string");

    expect(isLocalCacheSchemaReady(tableNames)).toBe(true);
  });

  test("viewport sync hydrates empty SQLite cache from server upserts using seeded coords", async () => {
    const row = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.emptyCache,
    );
    const bounds = boundsAround(row.latitude, row.longitude);
    const localDb = createTestLocalDb();

    const firstSync = await runViewportCacheSync(localDb, bounds);

    expect(firstSync.syncResponse.upserts.some((entry) => entry.id === row.id)).toBe(
      true,
    );
    expect(firstSync.syncResponse.deleteIds).toEqual([]);
    expectViewportEntryMatchesRow(firstSync.rendered.get(row.id), row);
    expect(firstSync.rendered.get(row.id)?.loadedFromCache).toBe(false);

    const cached = await localDb.getInBounds(bounds);
    expect(cached).toHaveLength(1);
    expectViewportEntryMatchesRow(cached[0], row);

    const idVersions = await localDb.getIdVersionPairsInBounds(bounds);
    expectClientCacheEntry(idVersions, row);
  });

  test("warm SQLite cache skips redundant server upserts for matching id and version", async () => {
    const row = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.warmCache,
    );
    const bounds = boundsAround(row.latitude, row.longitude);
    const localDb = createTestLocalDb();

    await runViewportCacheSync(localDb, bounds);
    const secondSync = await runViewportCacheSync(localDb, bounds);

    expect(secondSync.syncResponse.upserts).toEqual([]);
    expect(secondSync.syncResponse.deleteIds).toEqual([]);
    expectViewportEntryMatchesRow(secondSync.rendered.get(row.id), row);
    expect(secondSync.rendered.get(row.id)?.loadedFromCache).toBe(true);

    const cached = await localDb.getInBounds(bounds);
    expect(cached).toHaveLength(1);
    expectViewportEntryMatchesRow(cached[0], row);
  });

  test("local re-read after remote fetch preserves loadedFromCache false", async () => {
    const row = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.emptyCache,
    );
    const bounds = boundsAround(row.latitude, row.longitude);
    const localDb = createTestLocalDb();

    const firstSync = await runViewportCacheSync(localDb, bounds);
    expect(firstSync.rendered.get(row.id)?.loadedFromCache).toBe(false);

    const localReread = await runViewportLocalCacheSync(
      localDb,
      bounds,
      2,
      (activeRequestId) => activeRequestId === 2,
      firstSync.rendered,
    );
    expect(localReread.rendered.get(row.id)?.loadedFromCache).toBe(false);
  });

  test("stale cached version updates SQLite after server upsert", async () => {
    const row = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.staleVersion,
    );
    const bounds = boundsAround(row.latitude, row.longitude);
    const localDb = createTestLocalDb();

    await runViewportCacheSync(localDb, bounds);
    originalVersions.set(row.id, row.version);
    await setBathroomVersion(row.id, 3);

    const refreshed = await runViewportCacheSync(localDb, bounds);
    const upsert = refreshed.syncResponse.upserts.find((entry) => entry.id === row.id);

    expect(upsert?.version).toBe(3);
    expect(refreshed.rendered.get(row.id)?.version).toBe(3);
    expect(refreshed.rendered.get(row.id)?.loadedFromCache).toBe(true);

    const cached = await localDb.getInBounds(bounds);
    expect(cached[0]?.version).toBe(3);
  });

  test("SQLite cache removes phantom ids returned in server DELETE responses", async () => {
    const row = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.deletePhantom,
    );
    const bounds = boundsAround(row.latitude, row.longitude);
    const localDb = createTestLocalDb();
    const phantomId = 9_999_999;

    await runViewportCacheSync(localDb, bounds);
    await localDb.upsertMany([
      {
        id: phantomId,
        latitude: row.latitude + 0.001,
        longitude: row.longitude + 0.001,
        verify_status: "pending",
        version: 0,
      },
    ]);

    const beforeDelete = await localDb.getIdVersionPairsInBounds(bounds);
    expect(beforeDelete.some((entry) => entry.id === phantomId)).toBe(true);

    const syncResponse = await bathroomDbSyncInBounds(bounds, beforeDelete);
    expect(syncResponse.deleteIds).toContain(phantomId);
    expect(syncResponse.deleteIds).not.toContain(row.id);

    await localDb.deleteMany(syncResponse.deleteIds);

    const afterDelete = await localDb.getInBounds(bounds);
    expect(afterDelete.some((entry) => entry.id === phantomId)).toBe(false);
    expectViewportEntryMatchesRow(
      afterDelete.find((entry) => entry.id === row.id),
      row,
    );
  });

  test("SQLite getInBounds excludes seeded bathrooms outside the viewport", async () => {
    const inBounds = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.emptyCache,
    );
    const outOfBounds = findSeededRow(
      seededRows,
      locations,
      CACHE_TEST_LOCATIONS.outOfBounds,
    );
    const bounds = boundsAround(inBounds.latitude, inBounds.longitude);
    const localDb = createTestLocalDb();
    await localDb.init();

    await localDb.upsertMany([
      {
        id: inBounds.id,
        latitude: inBounds.latitude,
        longitude: inBounds.longitude,
        verify_status: inBounds.verify_status,
        version: inBounds.version,
      },
      {
        id: outOfBounds.id,
        latitude: outOfBounds.latitude,
        longitude: outOfBounds.longitude,
        verify_status: outOfBounds.verify_status,
        version: outOfBounds.version,
      },
    ]);

    const cached = await localDb.getInBounds(bounds);
    expect(cached.map((entry) => entry.id)).toEqual([inBounds.id]);
  });

  test("upserting a new bathroom evicts the oldest expired SQLite cache entry", async () => {
    const nowMs = Date.UTC(2026, 5, 11, 12, 0, 0);
    const expiredRow = findSeededRow(seededRows, locations, "cairo");
    const freshRow = findSeededRow(seededRows, locations, "oslo");
    const localDb = createBathroomLocalDbSqlite({
      cacheExpirationSecs: 60,
      initSqliteWasm: loadSqliteWasmModule,
      now: () => nowMs,
    });

    await localDb.init();
    await localDb.upsertMany([
      {
        id: expiredRow.id,
        latitude: expiredRow.latitude,
        longitude: expiredRow.longitude,
        verify_status: expiredRow.verify_status,
        version: expiredRow.version,
      },
    ]);
    await setCacheUpdatedAt(
      localDb,
      expiredRow.id,
      new Date(nowMs - 120_000).toISOString(),
    );

    await localDb.upsertMany([
      {
        id: freshRow.id,
        latitude: freshRow.latitude,
        longitude: freshRow.longitude,
        verify_status: freshRow.verify_status,
        version: freshRow.version,
      },
    ]);

    const worldEntries = await localDb.getInBounds(WORLD_BOUNDS);
    expect(worldEntries.map((entry) => entry.id)).toEqual([freshRow.id]);
  });

  test("sync rejects invalid bbox coordinates", async () => {
    await expect(
      bathroomDbSyncInBounds(
        {
          lowerLeft: { latitude: Number.NaN, longitude: 0 },
          upperRight: { latitude: 1, longitude: 1 },
        },
        [],
      ),
    ).rejects.toThrow(READ_IN_BOUNDS_ERROR_CONTEXT);
  });
});

describe("bathroom viewport sync runtime integration", () => {
  const bounds: ViewportBounds = {
    lowerLeft: { latitude: 10, longitude: 20 },
    upperRight: { latitude: 11, longitude: 21 },
  };
  const cachedEntry: BathroomViewportEntry = {
    id: 777,
    latitude: 10.5,
    longitude: 20.5,
    verify_status: "pending",
    version: 1,
  };

  test("viewport sync keeps local markers rendered when remote sync fails", async () => {
    const localDb = createTestLocalDb();
    await localDb.init();
    await localDb.upsertMany([cachedEntry]);

    const syncResult = await runViewportCacheSync(localDb, bounds, {
      syncRemote: async (): Promise<Errorable<BathroomSyncResponse>> => ({
        val: null,
        errorMsg: "forced integration failure",
      }),
    });

    expect(syncResult.remoteError).toBe("forced integration failure");
    expect(renderedIds(syncResult.rendered)).toEqual([cachedEntry.id]);
    const cached = await localDb.getInBounds(bounds);
    expect(cached).toHaveLength(1);
    expect(cached[0]).toMatchObject(cachedEntry);
  });

  test("viewport sync emits local render before awaiting remote response", async () => {
    const localDb = createTestLocalDb();
    await localDb.init();
    await localDb.upsertMany([cachedEntry]);

    let resolveRemote:
      | ((value: Errorable<BathroomSyncResponse>) => void)
      | undefined;
    const remotePromise = new Promise<Errorable<BathroomSyncResponse>>((resolve) => {
      resolveRemote = resolve;
    });
    const renderedSnapshots: number[][] = [];
    let renderedCountAtRemoteCall = -1;

    const runPromise = runBathroomViewportSyncForGlobe({
      globe: {
        getCameraHeightM: () => BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M - 1,
        getViewportBoundsLatLon: () => bounds,
      },
      requestId: 44,
      maxQueryCameraHeightM: BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M,
      localDbPort: localDb,
      isRequestCurrent: () => true,
      syncRemote: async (
        _viewportBounds: ViewportBounds,
        _clientCache: BathroomClientCacheEntry[],
      ) => {
        renderedCountAtRemoteCall = renderedSnapshots.length;
        return remotePromise;
      },
      onRenderedBathroomsChange: (rendered) => {
        renderedSnapshots.push(renderedIds(rendered));
      },
      onClearBathrooms: () => {
        renderedSnapshots.push([]);
      },
    });

    for (let i = 0; i < 50 && renderedCountAtRemoteCall < 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(renderedCountAtRemoteCall).toBe(1);
    expect(renderedSnapshots[0]).toEqual([cachedEntry.id]);

    resolveRemote?.({ val: { upserts: [], deleteIds: [] } });
    await runPromise;
    expect(renderedSnapshots.at(-1)).toEqual([cachedEntry.id]);
  });

  test("local-only viewport sync hydrates SQLite cache without calling remote", async () => {
    const localDb = createTestLocalDb();
    await localDb.init();
    await localDb.upsertMany([cachedEntry]);

    const syncRemote = jest.fn(
      async (): Promise<Errorable<BathroomSyncResponse>> => ({
        val: { upserts: [], deleteIds: [] },
      }),
    );

    const result = await runViewportCacheSync(localDb, bounds, {
      localOnly: true,
      syncRemote,
    });

    expect(syncRemote).not.toHaveBeenCalled();
    expect(renderedIds(result.rendered)).toEqual([cachedEntry.id]);
    const cached = await localDb.getInBounds(bounds);
    expect(cached).toHaveLength(1);
    expect(cached[0]).toMatchObject(cachedEntry);
  });

  test("local SQLite scan runs while remote sync is blocked by in-flight request", async () => {
    const localDb = createTestLocalDb();
    await localDb.init();
    await localDb.upsertMany([cachedEntry]);

    let resolveFirstRemote:
      | ((value: Errorable<BathroomSyncResponse>) => void)
      | undefined;
    const firstRemotePromise = new Promise<Errorable<BathroomSyncResponse>>(
      (resolve) => {
        resolveFirstRemote = resolve;
      },
    );
    const remoteCalls: number[] = [];

    let gate = idleRemoteGate();
    const remoteStartedAt = Date.now();
    gate = { remoteInFlight: true, remoteStartedAtMs: remoteStartedAt };

    const localWhileBlocked = await runViewportLocalCacheSync(localDb, bounds, 10);
    expect(renderedIds(localWhileBlocked.rendered)).toEqual([cachedEntry.id]);

    const retryCheck = simulateRemoteGateRetry(
      gate,
      remoteStartedAt + BathroomRemoteDB.READ_RETRY_MS - 1,
    );
    expect(retryCheck.allowRetry).toBe(false);

    const firstRemote = runViewportRemoteCacheSync(
      localDb,
      bounds,
      localWhileBlocked.rendered,
      {
        requestId: 11,
        syncRemote: async () => {
          remoteCalls.push(11);
          return firstRemotePromise;
        },
      },
    );

    const localAgain = await runViewportLocalCacheSync(localDb, bounds, 12);
    expect(renderedIds(localAgain.rendered)).toEqual([cachedEntry.id]);
    expect(remoteCalls).toEqual([11]);

    resolveFirstRemote?.({ val: { upserts: [], deleteIds: [] } });
    await firstRemote;
    gate = completedRemoteGate();
    expect(gate.remoteInFlight).toBe(false);

    const retryAllowed = simulateRemoteGateRetry(
      gate,
      remoteStartedAt + BathroomRemoteDB.READ_RETRY_MS,
    );
    expect(retryAllowed.allowRetry).toBe(true);
  });

  test("remote retry gate allows a second SQLite-backed remote sync after timeout", async () => {
    const localDb = createTestLocalDb();
    await localDb.init();
    await localDb.upsertMany([cachedEntry]);

    let resolveStalledRemote:
      | ((value: Errorable<BathroomSyncResponse>) => void)
      | undefined;
    const stalledRemotePromise = new Promise<Errorable<BathroomSyncResponse>>(
      (resolve) => {
        resolveStalledRemote = resolve;
      },
    );
    let resolveFirstRemoteStarted: (() => void) | undefined;
    const firstRemoteStarted = new Promise<void>((resolve) => {
      resolveFirstRemoteStarted = resolve;
    });
    const remoteCalls: number[] = [];
    let activeRequestId = 21;

    const remoteStartedAt = Date.UTC(2026, 5, 11, 12, 0, 0);
    let gate = remoteSyncStarted(remoteStartedAt);

    const stalledRemote = runViewportRemoteCacheSync(
      localDb,
      bounds,
      createRenderedBathroomMap([cachedEntry]),
      {
        requestId: 21,
        isRequestCurrent: (requestId) => requestId === activeRequestId,
        syncRemote: async () => {
          remoteCalls.push(21);
          resolveFirstRemoteStarted?.();
          return stalledRemotePromise;
        },
      },
    );

    await firstRemoteStarted;

    const blockedRetry = simulateRemoteGateRetry(
      gate,
      remoteStartedAt + BathroomRemoteDB.READ_RETRY_MS - 1,
    );
    expect(blockedRetry.allowRetry).toBe(false);

    const allowedRetry = simulateRemoteGateRetry(
      gate,
      remoteStartedAt + BathroomRemoteDB.READ_RETRY_MS,
    );
    expect(allowedRetry.allowRetry).toBe(true);
    gate = allowedRetry.nextGate;
    activeRequestId = 22;

    const retryRemote = await runViewportRemoteCacheSync(
      localDb,
      bounds,
      createRenderedBathroomMap([cachedEntry]),
      {
        requestId: 22,
        isRequestCurrent: (requestId) => requestId === activeRequestId,
        syncRemote: async () => {
          remoteCalls.push(22);
          return {
            val: {
              upserts: [
                {
                  ...cachedEntry,
                  verify_status: "verified",
                  version: 2,
                },
              ],
              deleteIds: [],
            },
          };
        },
      },
    );

    expect(remoteCalls).toEqual([21, 22]);
    expect(retryRemote.rendered.get(cachedEntry.id)?.verify_status).toBe("verified");
    expect(retryRemote.rendered.get(cachedEntry.id)?.version).toBe(2);

    const cached = await localDb.getInBounds(bounds);
    expect(cached[0]?.verify_status).toBe("verified");
    expect(cached[0]?.version).toBe(2);

    resolveStalledRemote?.({ val: { upserts: [], deleteIds: [] } });
    await stalledRemote;
    gate = completedRemoteGate();
    expect(gate.remoteInFlight).toBe(false);

    const cachedAfterStaleRemote = await localDb.getInBounds(bounds);
    expect(cachedAfterStaleRemote[0]?.verify_status).toBe("verified");
    expect(cachedAfterStaleRemote[0]?.version).toBe(2);
  });

  test("camera-height gate clears rendered state and skips remote sync when zoomed out", async () => {
    const localDb = createTestLocalDb();
    const syncRemote = jest.fn(
      async (): Promise<Errorable<BathroomSyncResponse>> => ({
        val: { upserts: [], deleteIds: [] },
      }),
    );
    const onClearBathrooms = jest.fn();

    await runBathroomViewportSyncForGlobe({
      globe: {
        getCameraHeightM: () => BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M + 1,
        getViewportBoundsLatLon: () => bounds,
      },
      requestId: 55,
      maxQueryCameraHeightM: BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M,
      localDbPort: localDb,
      isRequestCurrent: () => true,
      syncRemote,
      onRenderedBathroomsChange: () => {
        throw new Error("Rendered callbacks should not run while zoomed out");
      },
      onClearBathrooms,
    });

    expect(onClearBathrooms).toHaveBeenCalledTimes(1);
    expect(syncRemote).not.toHaveBeenCalled();
  });
});

describe("bathroom marker renderer integration", () => {
  const markerViewportBounds: ViewportBounds = {
    lowerLeft: { latitude: 47.6, longitude: -122.35 },
    upperRight: { latitude: 47.62, longitude: -122.33 },
  };
  const markerViewportCenter = { latitude: 47.61, longitude: -122.34 };

  const markerSyncContext = (
    current: RenderedBathroomEntry[],
    previous?: RenderedBathroomMap,
    destroyDistanceFromCenterM: number = BathroomMapMarker.DESTROY_DISTANCE_FROM_VIEWPORT_CENTER,
  ): BathroomMarkersSyncContext => ({
    current,
    previous,
    viewportCenter: markerViewportCenter,
    viewportBounds: markerViewportBounds,
    destroyDistanceFromCenterM,
  });

  test("installBathroomMarkers diffs, pools, culls, and destroys distant markers", () => {
    const harness = createBathroomMarkerHarness();
    const markerHandle = installBathroomMarkers(harness.Cesium, harness.viewer);

    const firstEntry: RenderedBathroomEntry = {
      id: 1,
      latitude: 47.61,
      longitude: -122.33,
      verify_status: "pending",
      version: 1,
      loadedFromCache: true,
    };
    markerHandle.sync(markerSyncContext([firstEntry]));
    expect(harness.entities).toHaveLength(1);
    expect(harness.entities[0]?.name).toBe("BathroomMarker-1");
    expect(harness.entities[0]?.show).toBe(true);
    expect(harness.entities[0]?.billboard?.image).toBe(
      BathroomMapMarker.PENDING_IMAGE,
    );
    expect(harness.entities[0]?.billboard?.color?.value?.css).toBe(
      bathroomMarkerBillboardTint(true).color,
    );

    const previousRendered = createRenderedBathroomMap([
      {
        id: 1,
        latitude: 47.61,
        longitude: -122.33,
        verify_status: "pending",
        version: 1,
      },
    ]);
    const secondPass: RenderedBathroomEntry[] = [
      {
        id: 1,
        latitude: 47.611,
        longitude: -122.331,
        verify_status: "verified",
        version: 2,
        loadedFromCache: false,
      },
      {
        id: 2,
        latitude: 47.612,
        longitude: -122.332,
        verify_status: "pending",
        version: 1,
        loadedFromCache: true,
      },
    ];
    markerHandle.sync(markerSyncContext(secondPass, previousRendered));
    expect(harness.entities).toHaveLength(2);
    const markerOne = harness.entities.find((entity) => entity.name === "BathroomMarker-1");
    const markerTwo = harness.entities.find((entity) => entity.name === "BathroomMarker-2");
    expect(markerOne?.billboard?.image).toBe(BathroomMapMarker.VERIFIED_IMAGE);
    expect(markerOne?.billboard?.color?.value?.css).toBe(
      bathroomMarkerBillboardTint(false).color,
    );
    expect(markerTwo?.show).toBe(true);
    expect(markerTwo?.billboard?.color?.value?.css).toBe(
      bathroomMarkerBillboardTint(true).color,
    );

    const thirdPassPrevious = createRenderedBathroomMap(secondPass);
    markerHandle.sync(
      markerSyncContext(
        [
          {
            id: 2,
            latitude: 47.612,
            longitude: -122.332,
            verify_status: "pending",
            version: 1,
            loadedFromCache: true,
          },
        ],
        thirdPassPrevious,
      ),
    );
    expect(harness.entities).toHaveLength(2);
    expect(markerOne?.show).toBe(false);
    expect(markerTwo?.show).toBe(true);

    markerHandle.stopRendering();
    expect(markerOne?.show).toBe(false);
    expect(markerTwo?.show).toBe(false);

    markerHandle.sync(
      markerSyncContext([], undefined, 100),
    );
    expect(harness.entities).toHaveLength(0);
    expect(harness.removedEntities.length).toBeGreaterThanOrEqual(2);

    markerHandle.clear();
    expect(harness.entities).toHaveLength(0);
    expect(harness.requestRender).toHaveBeenCalled();
  });
});
