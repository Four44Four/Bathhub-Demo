import { type BathroomDataPrimaryRow } from "../../../_shared/BathroomDataPrimary";
import { parseCachedBathroomRecord } from "./CachedBathroomRecord";

export type CachedBathroomH3CellRecord = {
  resolution: number;
  cell: string;
  rows: BathroomDataPrimaryRow[];
};

export function serializeCachedBathroomH3CellRecord(
  record: CachedBathroomH3CellRecord,
): string {
  return JSON.stringify(record);
}

export function parseCachedBathroomH3CellRecord(
  raw: string,
): CachedBathroomH3CellRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Partial<CachedBathroomH3CellRecord>;
  if (
    typeof candidate.resolution !== "number" ||
    !Number.isSafeInteger(candidate.resolution) ||
    typeof candidate.cell !== "string" ||
    !Array.isArray(candidate.rows)
  ) {
    return null;
  }

  const rows: BathroomDataPrimaryRow[] = [];
  for (const row of candidate.rows) {
    const parsedRow = parseCachedBathroomRecord(JSON.stringify(row));
    if (parsedRow === null) {
      return null;
    }
    rows.push(parsedRow);
  }

  return {
    resolution: candidate.resolution,
    cell: candidate.cell,
    rows,
  };
}
