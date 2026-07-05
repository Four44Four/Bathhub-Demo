import {
  createAt as bathroomDbCreate,
  getInBounds as bathroomDbReadInBounds,
  updateVerifyStatus as bathroomDbUpdateVerifyStatus,
} from "../app/_server/database/bathroom-data-primary/CrudCore";
import {
  CREATE_BATHROOM_ERROR_CONTEXT,
  TEMP_DATA_LENGTH,
} from "../app/_server/pure/bathroom-data-primary/CreateBathroom";
import {
  type BathroomDataPrimaryRow,
  type ViewportBounds,
} from "../app/_shared/BathroomDataPrimary";
import {
  type FailedRowReport,
  type InputCoordinate,
  printCrudReport,
} from "./formatCrudReport";
import { loadLocations } from "./loadLocations";
import { requireLocalSupabaseEnv } from "./requireLocalSupabase";

const READ_IN_BOUNDS_ERROR_CONTEXT =
  "Failed to list bathroom_data_primary rows in bounds" as const;

const COORD_EPSILON = 1e-5;
const WORLD_BOUNDS: ViewportBounds = {
  lowerLeft: { latitude: -90, longitude: -180 },
  upperRight: { latitude: 90, longitude: 180 },
};

/** Viewport in the South Atlantic with no seeded bathrooms. */
const EMPTY_OCEAN_BOUNDS: ViewportBounds = {
  lowerLeft: { latitude: -5, longitude: -10 },
  upperRight: { latitude: -4, longitude: -9 },
};

function nearlyEqual(actual: number, expected: number, epsilon = COORD_EPSILON): boolean {
  return Math.abs(actual - expected) <= epsilon;
}

function boundsAround(
  latitude: number,
  longitude: number,
  delta = 0.01,
): ViewportBounds {
  return {
    lowerLeft: {
      latitude: latitude - delta,
      longitude: longitude - delta,
    },
    upperRight: {
      latitude: latitude + delta,
      longitude: longitude + delta,
    },
  };
}

function formatPhaseError(phase: "create" | "read", error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${phase}: ${message}`;
}

function validateRow(
  expected: InputCoordinate,
  actual: BathroomDataPrimaryRow | undefined,
  phase: "create" | "read",
): string[] {
  const errors: string[] = [];

  if (actual === undefined) {
    errors.push(`${phase}: row not found in database`);
    return errors;
  }

  if (!nearlyEqual(actual.latitude, expected.latitude)) {
    errors.push(
      `${phase}: latitude expected ${expected.latitude}, got ${actual.latitude}`,
    );
  }

  if (!nearlyEqual(actual.longitude, expected.longitude)) {
    errors.push(
      `${phase}: longitude expected ${expected.longitude}, got ${actual.longitude}`,
    );
  }

  if (actual.verify_status !== expected.verify_status) {
    errors.push(
      `${phase}: verify_status expected ${expected.verify_status}, got ${actual.verify_status}`,
    );
  }

  if (actual.version !== 0) {
    errors.push(`${phase}: version expected 0, got ${actual.version}`);
  }

  if (actual.temp_data.length !== TEMP_DATA_LENGTH) {
    errors.push(
      `${phase}: temp_data length expected ${TEMP_DATA_LENGTH}, got ${actual.temp_data.length}`,
    );
  } else if (!/^[a-zA-Z0-9]+$/.test(actual.temp_data)) {
    errors.push(`${phase}: temp_data is not alphanumeric`);
  }

  return errors;
}

function recordFailure(
  failures: FailedRowReport[],
  label: string,
  row: BathroomDataPrimaryRow | null,
  errors: string[],
): void {
  if (errors.length === 0) {
    return;
  }

  const existing = failures.find(
    (failure) => failure.label === label && failure.row?.id === row?.id,
  );

  if (existing !== undefined) {
    existing.errors.push(...errors);
    if (existing.row === null && row !== null) {
      existing.row = row;
    }
    return;
  }

  failures.push({ label, row, errors });
}

function failuresForPhase(
  failures: FailedRowReport[],
  phase: "create" | "read",
): FailedRowReport[] {
  const prefix = `${phase}:`;
  return failures.filter((failure) =>
    failure.errors.some((error) => error.startsWith(prefix)),
  );
}

describe("bathroom_data_primary CRUD against local Supabase", () => {
  const expectedBathrooms = loadLocations();
  const created: Array<{ expected: InputCoordinate; row: BathroomDataPrimaryRow }> = [];
  const failedRows: FailedRowReport[] = [];
  let tableRows: BathroomDataPrimaryRow[] = [];
  let testsPassed = true;

  beforeAll(() => {
    requireLocalSupabaseEnv();
  });

  beforeAll(async () => {
    for (const expected of expectedBathrooms) {
      let row: BathroomDataPrimaryRow;

      try {
        row = await bathroomDbCreate(expected.latitude, expected.longitude);
        created.push({ expected, row });

        recordFailure(
          failedRows,
          expected.label,
          row,
          validateRow(expected, row, "create"),
        );
      } catch (error) {
        testsPassed = false;
        recordFailure(failedRows, expected.label, null, [
          formatPhaseError("create", error),
        ]);
        continue;
      }

      try {
        const rows = await bathroomDbReadInBounds(
          boundsAround(expected.latitude, expected.longitude),
        );
        const persisted = rows.find((candidate) => candidate.id === row.id);

        recordFailure(
          failedRows,
          expected.label,
          persisted ?? null,
          validateRow(expected, persisted, "read"),
        );
      } catch (error) {
        testsPassed = false;
        recordFailure(failedRows, expected.label, row, [
          formatPhaseError("read", error),
        ]);
      }
    }

    try {
      tableRows = await bathroomDbReadInBounds(WORLD_BOUNDS);
      if (tableRows.length !== expectedBathrooms.length) {
        testsPassed = false;
        recordFailure(failedRows, "(table scan)", null, [
          `read: expected ${expectedBathrooms.length} rows in bathroom_data_primary, got ${tableRows.length}`,
        ]);
      }
    } catch (error) {
      testsPassed = false;
      recordFailure(failedRows, "(table scan)", null, [
        formatPhaseError("read", error),
      ]);
    }
  });

  afterAll(() => {
    if (failedRows.length > 0 || created.length !== expectedBathrooms.length) {
      testsPassed = false;
    }

    printCrudReport({
      inputs: expectedBathrooms,
      tableRows,
      failedRows,
      testsPassed,
    });
  });

  test("local Supabase env is configured", () => {
    const env = requireLocalSupabaseEnv();
    expect(env.url).toMatch(/^https?:\/\//);
    expect(env.key.length).toBeGreaterThan(0);
  });

  test("create responses match pre-generated locations and verify statuses", () => {
    expect(created).toHaveLength(expectedBathrooms.length);
    expect(failuresForPhase(failedRows, "create")).toHaveLength(0);
  });

  test("bathroomDbReadInBounds returns persisted rows matching expected data", () => {
    expect(created).toHaveLength(expectedBathrooms.length);
    expect(failuresForPhase(failedRows, "read")).toHaveLength(0);
  });

  test("bathroom_data_primary row count matches locations.json after seeding", () => {
    expect(tableRows).toHaveLength(expectedBathrooms.length);
  });

  test("bathroomDbUpdateVerifyStatus updates verify_status and increments version", async () => {
    const target = created[0]?.row;
    expect(target).toBeDefined();
    if (target === undefined) return;

    const updated = await bathroomDbUpdateVerifyStatus(target.id, "verified");

    expect(updated).toMatchObject({
      id: target.id,
      latitude: target.latitude,
      longitude: target.longitude,
      verify_status: "verified",
      version: target.version + 1,
    });

    const rows = await bathroomDbReadInBounds(
      boundsAround(target.latitude, target.longitude),
    );
    const persisted = rows.find((candidate) => candidate.id === target.id);
    expect(persisted).toMatchObject({
      id: target.id,
      verify_status: "verified",
      version: target.version + 1,
    });
  });

  test("bathroomDbReadInBounds returns empty for an out-of-bounds viewport", async () => {
    const rows = await bathroomDbReadInBounds(EMPTY_OCEAN_BOUNDS);
    expect(rows).toEqual([]);
  });

  describe("error paths", () => {
    test("bathroomDbCreate rejects invalid latitude from PostGIS", async () => {
      await expect(bathroomDbCreate(Number.NaN, 0)).rejects.toThrow(
        CREATE_BATHROOM_ERROR_CONTEXT,
      );

      expect((await bathroomDbReadInBounds(WORLD_BOUNDS)).length).toBe(
        expectedBathrooms.length,
      );
    });

    test("bathroomDbReadInBounds rejects invalid bbox coordinates from PostGIS", async () => {
      await expect(
        bathroomDbReadInBounds({
          lowerLeft: { latitude: Number.NaN, longitude: 0 },
          upperRight: { latitude: 1, longitude: 1 },
        }),
      ).rejects.toThrow(READ_IN_BOUNDS_ERROR_CONTEXT);

      expect((await bathroomDbReadInBounds(WORLD_BOUNDS)).length).toBe(
        expectedBathrooms.length,
      );
    });
  });
});
