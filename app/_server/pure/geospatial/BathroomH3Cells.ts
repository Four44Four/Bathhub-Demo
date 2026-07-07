import {
  cellToBoundary,
  getHexagonAreaAvg,
  gridDisk,
  latLngToCell,
  polygonToCells,
  UNITS,
} from "h3-js";

import {
  type BathroomDataPrimaryRow,
  type BathroomSyncUpsert,
  type LatLong,
  type ViewportBounds,
} from "../../../_shared/BathroomDataPrimary";

export type BathroomH3Cell = string;

export type BathroomH3CellPolygon = {
  cell: BathroomH3Cell;
  polygon: {
    type: "Polygon";
    coordinates: number[][][];
  };
};

export type BathroomH3CellRow = {
  cell: BathroomH3Cell;
  row: BathroomDataPrimaryRow;
};

export type BathroomH3CellSyncRow = {
  cell: BathroomH3Cell;
  row: BathroomSyncUpsert;
};

export function bathroomLatLongToH3Cell(
  latLong: LatLong,
  resolution: number,
): BathroomH3Cell {
  return latLngToCell(latLong.latitude, latLong.longitude, resolution);
}

export function viewportBoundsToH3Cells(
  bounds: ViewportBounds,
  resolution: number,
): BathroomH3Cell[] {
  const polygon = [
    [
      [bounds.lowerLeft.latitude, bounds.lowerLeft.longitude],
      [bounds.lowerLeft.latitude, bounds.upperRight.longitude],
      [bounds.upperRight.latitude, bounds.upperRight.longitude],
      [bounds.upperRight.latitude, bounds.lowerLeft.longitude],
      [bounds.lowerLeft.latitude, bounds.lowerLeft.longitude],
    ],
  ];

  const centerCells = polygonToCells(polygon, resolution);
  if (centerCells.length === 0) {
    centerCells.push(
      bathroomLatLongToH3Cell(viewportBoundsCenter(bounds), resolution),
    );
  }
  return sortedUniqueCells(centerCells.flatMap((cell) => gridDisk(cell, 1)));
}

export function estimateViewportH3CellCount(
  bounds: ViewportBounds,
  resolution: number,
): number {
  const latitudeDelta = Math.max(
    0,
    bounds.upperRight.latitude - bounds.lowerLeft.latitude,
  );
  const longitudeDelta = Math.max(
    0,
    bounds.upperRight.longitude - bounds.lowerLeft.longitude,
  );
  const centerLatitudeRadians =
    (((bounds.lowerLeft.latitude + bounds.upperRight.latitude) / 2) *
      Math.PI) /
    180;
  const kilometersPerLatitudeDegree = 111.32;
  const kilometersPerLongitudeDegree =
    kilometersPerLatitudeDegree *
    Math.max(Math.abs(Math.cos(centerLatitudeRadians)), 0.01);
  const boundsAreaKm2 =
    latitudeDelta *
    kilometersPerLatitudeDegree *
    longitudeDelta *
    kilometersPerLongitudeDegree;
  const averageCellAreaKm2 = getHexagonAreaAvg(resolution, UNITS.km2);
  return Math.ceil(boundsAreaKm2 / averageCellAreaKm2);
}

export function h3CellToPostgisPolygon(
  cell: BathroomH3Cell,
): BathroomH3CellPolygon {
  const boundary = cellToBoundary(cell, true);
  const closedBoundary = [...boundary, boundary[0]];
  return {
    cell,
    polygon: {
      type: "Polygon",
      coordinates: [closedBoundary],
    },
  };
}

export function filterRowsToViewportBounds<T extends LatLong>(
  rows: readonly T[],
  bounds: ViewportBounds,
): T[] {
  return rows.filter((row) => isLatLongInViewportBounds(row, bounds));
}

export function isLatLongInViewportBounds(
  latLong: LatLong,
  bounds: ViewportBounds,
): boolean {
  return (
    latLong.latitude >= bounds.lowerLeft.latitude &&
    latLong.latitude <= bounds.upperRight.latitude &&
    latLong.longitude >= bounds.lowerLeft.longitude &&
    latLong.longitude <= bounds.upperRight.longitude
  );
}

export function dedupeBathroomRowsById<T extends { id: number }>(
  rows: readonly T[],
): T[] {
  const byId = new Map<number, T>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

export function bucketBathroomRowsByH3Cell(
  cells: readonly BathroomH3Cell[],
  rows: readonly BathroomDataPrimaryRow[],
  resolution: number,
): Map<BathroomH3Cell, BathroomDataPrimaryRow[]> {
  const rowsByCell = emptyCellMap<BathroomDataPrimaryRow>(cells);
  for (const row of rows) {
    const cell = bathroomLatLongToH3Cell(row, resolution);
    rowsByCell.get(cell)?.push(row);
  }
  return rowsByCell;
}

export function bucketBathroomSyncRowsByH3Cell(
  cells: readonly BathroomH3Cell[],
  rows: readonly BathroomSyncUpsert[],
  resolution: number,
): Map<BathroomH3Cell, BathroomSyncUpsert[]> {
  const rowsByCell = emptyCellMap<BathroomSyncUpsert>(cells);
  for (const row of rows) {
    const cell = bathroomLatLongToH3Cell(row, resolution);
    rowsByCell.get(cell)?.push(row);
  }
  return rowsByCell;
}

export function sortedUniqueCells(
  cells: readonly BathroomH3Cell[],
): BathroomH3Cell[] {
  return Array.from(new Set(cells)).sort();
}

function viewportBoundsCenter(bounds: ViewportBounds): LatLong {
  return {
    latitude: (bounds.lowerLeft.latitude + bounds.upperRight.latitude) / 2,
    longitude: (bounds.lowerLeft.longitude + bounds.upperRight.longitude) / 2,
  };
}

function emptyCellMap<T>(
  cells: readonly BathroomH3Cell[],
): Map<BathroomH3Cell, T[]> {
  return new Map(cells.map((cell) => [cell, []]));
}
