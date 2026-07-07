import {
  type BathroomDataPrimaryRow,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";
import {
  bucketBathroomRowsByH3Cell,
  bathroomLatLongToH3Cell,
  dedupeBathroomRowsById,
  estimateViewportH3CellCount,
  filterRowsToViewportBounds,
  h3CellToPostgisPolygon,
  viewportBoundsToH3Cells,
  type BathroomH3Cell,
  type BathroomH3CellPolygon,
} from "../geospatial/BathroomH3Cells";

export const GET_BATHROOM_H3_CELLS_RPC_NAME =
  "get_bathroom_data_primary_in_h3_cell_polygons" as const;

export type BathroomH3CellRpcParams = {
  p_cells: BathroomH3CellPolygon[];
};

export type BathroomH3CellRpcRow = BathroomDataPrimaryRow & {
  cell: BathroomH3Cell;
};

export type H3BoundsCacheDependencies = {
  resolution: number;
  maxCellCount: number;
  readCell: (
    cell: BathroomH3Cell,
    resolution: number,
  ) => Promise<BathroomDataPrimaryRow[] | null>;
  cacheCell: (
    cell: BathroomH3Cell,
    rows: readonly BathroomDataPrimaryRow[],
    resolution: number,
  ) => Promise<void>;
  fetchCells: (
    cellPolygons: readonly BathroomH3CellPolygon[],
  ) => Promise<BathroomH3CellRpcRow[]>;
  fallbackFetch: () => Promise<BathroomDataPrimaryRow[]>;
};

export function buildBathroomH3CellRpcParams(
  cellPolygons: readonly BathroomH3CellPolygon[],
): BathroomH3CellRpcParams {
  return {
    p_cells: [...cellPolygons],
  };
}

export function isBathroomH3BoundsCacheable(
  bounds: ViewportBounds,
  resolution: number,
  maxCellCount: number,
): boolean {
  if (estimateViewportH3CellCount(bounds, resolution) > maxCellCount) {
    return false;
  }
  const cells = viewportBoundsToH3Cells(bounds, resolution);
  return cells.length > 0 && cells.length <= maxCellCount;
}

export function parseBathroomH3CellRpcRows(
  payload: unknown,
): BathroomH3CellRpcRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const rows: BathroomH3CellRpcRow[] = [];
  for (const item of payload) {
    if (item === null || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.cell !== "string" ||
      typeof row.id !== "number" ||
      typeof row.latitude !== "number" ||
      typeof row.longitude !== "number" ||
      (row.verify_status !== "pending" && row.verify_status !== "verified") ||
      typeof row.temp_data !== "string" ||
      typeof row.created_at !== "string" ||
      typeof row.version !== "number"
    ) {
      continue;
    }
    rows.push({
      cell: row.cell,
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      verify_status: row.verify_status,
      temp_data: row.temp_data,
      created_at: row.created_at,
      version: row.version,
    });
  }
  return rows;
}

/** Keep only RPC rows whose assigned cell matches {@link bathroomLatLongToH3Cell}. */
export function filterBathroomH3CellRpcRowsByCanonicalCell(
  rows: readonly BathroomH3CellRpcRow[],
  resolution: number,
): BathroomH3CellRpcRow[] {
  return rows.filter(
    (row) => bathroomLatLongToH3Cell(row, resolution) === row.cell,
  );
}

export async function loadBathroomRowsInBoundsViaH3Cache(
  bounds: ViewportBounds,
  deps: H3BoundsCacheDependencies,
): Promise<BathroomDataPrimaryRow[]> {
  if (
    estimateViewportH3CellCount(bounds, deps.resolution) > deps.maxCellCount
  ) {
    return exactBoundsRows(await deps.fallbackFetch(), bounds);
  }

  const cells = viewportBoundsToH3Cells(bounds, deps.resolution);
  if (cells.length === 0 || cells.length > deps.maxCellCount) {
    return exactBoundsRows(await deps.fallbackFetch(), bounds);
  }

  const cachedRows: BathroomDataPrimaryRow[] = [];
  const missedCells: BathroomH3Cell[] = [];

  await Promise.all(
    cells.map(async (cell) => {
      try {
        const rows = await deps.readCell(cell, deps.resolution);
        if (rows === null) {
          missedCells.push(cell);
          return;
        }
        cachedRows.push(...rows);
      } catch {
        missedCells.push(cell);
      }
    }),
  );

  if (missedCells.length === 0) {
    return exactBoundsRows(cachedRows, bounds);
  }

  const missedCellPolygons = missedCells.map(h3CellToPostgisPolygon);
  const fetchedRows = dedupeBathroomRowsById(
    filterBathroomH3CellRpcRowsByCanonicalCell(
      await deps.fetchCells(missedCellPolygons),
      deps.resolution,
    ).map(h3CellRpcRowToBathroomRow),
  );
  const fetchedRowsByCell = bucketBathroomRowsByH3Cell(
    missedCells,
    fetchedRows,
    deps.resolution,
  );

  await Promise.all(
    missedCells.map(async (cell) => {
      try {
        await deps.cacheCell(
          cell,
          fetchedRowsByCell.get(cell) ?? [],
          deps.resolution,
        );
      } catch {
        // The DB result is still valid; Redis writes are best-effort.
      }
    }),
  );

  return exactBoundsRows([...cachedRows, ...fetchedRows], bounds);
}

function exactBoundsRows(
  rows: readonly BathroomDataPrimaryRow[],
  bounds: ViewportBounds,
): BathroomDataPrimaryRow[] {
  return filterRowsToViewportBounds(dedupeBathroomRowsById(rows), bounds);
}

function h3CellRpcRowToBathroomRow(
  row: BathroomH3CellRpcRow,
): BathroomDataPrimaryRow {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    verify_status: row.verify_status,
    temp_data: row.temp_data,
    created_at: row.created_at,
    version: row.version,
  };
}
