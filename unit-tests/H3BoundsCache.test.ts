import {
  buildBathroomH3CellRpcParams,
  filterBathroomH3CellRpcRowsByCanonicalCell,
  isBathroomH3BoundsCacheable,
  loadBathroomRowsInBoundsViaH3Cache,
  parseBathroomH3CellRpcRows,
} from "../app/_server/pure/bathroom-data-primary/H3BoundsCache";
import { computeBathroomSyncDiff } from "../app/_server/pure/bathroom-data-primary/SyncBathrooms";
import {
  bathroomLatLongToH3Cell,
  h3CellToPostgisPolygon,
  viewportBoundsToH3Cells,
} from "../app/_server/pure/geospatial/BathroomH3Cells";
import { type BathroomDataPrimaryRow } from "../app/_shared/BathroomDataPrimary";

const bounds = {
  lowerLeft: { latitude: 37.36155, longitude: -122.05533 },
  upperRight: { latitude: 37.36157, longitude: -122.05531 },
};

const row = (
  id: number,
  latitude = 37.36156,
  longitude = -122.05532,
  version = 0,
): BathroomDataPrimaryRow => ({
  id,
  latitude,
  longitude,
  verify_status: "pending",
  temp_data: `temp-${id}`,
  created_at: "2026-01-01T00:00:00.000Z",
  version,
});

describe("H3BoundsCache", () => {
  test("buildBathroomH3CellRpcParams wraps cell polygons for Supabase RPC", () => {
    const cell = bathroomLatLongToH3Cell(bounds.lowerLeft, 10);
    const polygon = h3CellToPostgisPolygon(cell);

    expect(buildBathroomH3CellRpcParams([polygon])).toEqual({
      p_cells: [polygon],
    });
  });

  test("parseBathroomH3CellRpcRows keeps well-formed rows only", () => {
    expect(
      parseBathroomH3CellRpcRows([
        { cell: "abc", ...row(1) },
        { cell: "bad", id: "nope" },
      ]),
    ).toEqual([{ cell: "abc", ...row(1) }]);
  });

  test("filterBathroomH3CellRpcRowsByCanonicalCell drops ST_Intersects mismatches", () => {
    const canonicalCell = bathroomLatLongToH3Cell(
      { latitude: 37.36156, longitude: -122.05532 },
      10,
    );
    const neighborCell = viewportBoundsToH3Cells(bounds, 10).find(
      (cell) => cell !== canonicalCell,
    );
    expect(neighborCell).toBeDefined();

    expect(
      filterBathroomH3CellRpcRowsByCanonicalCell(
        [
          { cell: canonicalCell, ...row(1) },
          { cell: neighborCell!, ...row(2) },
        ],
        10,
      ),
    ).toEqual([{ cell: canonicalCell, ...row(1) }]);
  });

  test("loadBathroomRowsInBoundsViaH3Cache fetches and caches only missed cells", async () => {
    const cells = viewportBoundsToH3Cells(bounds, 10);
    const cachedCell = cells[0];
    const cachedRows = new Map([[cachedCell, [row(1)]]]);
    const cacheWrites: Array<{ cell: string; rows: BathroomDataPrimaryRow[] }> = [];
    let fetchedCellCount = 0;

    const rows = await loadBathroomRowsInBoundsViaH3Cache(bounds, {
      resolution: 10,
      maxCellCount: 100,
      readCell: async (cell) => cachedRows.get(cell) ?? null,
      cacheCell: async (cell, rowsToCache) => {
        cacheWrites.push({ cell, rows: [...rowsToCache] });
      },
      fetchCells: async (cellPolygons) => {
        fetchedCellCount = cellPolygons.length;
        return [{ cell: cellPolygons[0].cell, ...row(2, 37.361561, -122.055321) }];
      },
      fallbackFetch: async () => [row(99)],
    });

    expect(rows.map((entry) => entry.id).sort()).toEqual([1, 2]);
    expect(fetchedCellCount).toBe(cells.length - 1);
    expect(cacheWrites).toHaveLength(cells.length - 1);
    expect(cacheWrites.some((write) => write.rows.length === 0)).toBe(true);
  });

  test("loadBathroomRowsInBoundsViaH3Cache falls back for oversized cell sets", async () => {
    const rows = await loadBathroomRowsInBoundsViaH3Cache(bounds, {
      resolution: 10,
      maxCellCount: 0,
      readCell: async () => {
        throw new Error("should not read cache");
      },
      cacheCell: async () => {
        throw new Error("should not write cache");
      },
      fetchCells: async () => {
        throw new Error("should not fetch cells");
      },
      fallbackFetch: async () => [row(3), row(4, 90, 0)],
    });

    expect(rows).toEqual([row(3)]);
  });

  test("cached H3 rows produce existing viewport sync diff semantics", async () => {
    const remoteRows = await loadBathroomRowsInBoundsViaH3Cache(bounds, {
      resolution: 10,
      maxCellCount: 100,
      readCell: async () => [row(1, 37.36156, -122.05532, 2), row(2)],
      cacheCell: async () => undefined,
      fetchCells: async () => [],
      fallbackFetch: async () => [],
    });

    expect(computeBathroomSyncDiff(remoteRows, [{ id: 1, version: 1 }])).toEqual({
      upserts: [
        {
          id: 1,
          latitude: 37.36156,
          longitude: -122.05532,
          verify_status: "pending",
          version: 2,
        },
        {
          id: 2,
          latitude: 37.36156,
          longitude: -122.05532,
          verify_status: "pending",
          version: 0,
        },
      ],
      deleteIds: [],
    });
  });

  test("isBathroomH3BoundsCacheable respects max cell guard", () => {
    expect(isBathroomH3BoundsCacheable(bounds, 10, 100)).toBe(true);
    expect(isBathroomH3BoundsCacheable(bounds, 10, 0)).toBe(false);
  });
});
