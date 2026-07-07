import { createClient } from "@supabase/supabase-js";
import { cellToLatLng, gridDisk } from "h3-js";

import { createAt as bathroomDbCreate } from "../app/_server/database/bathroom-data-primary/CrudCore";
import {
  GET_BATHROOM_H3_CELLS_RPC_NAME,
  buildBathroomH3CellRpcParams,
  parseBathroomH3CellRpcRows,
} from "../app/_server/pure/bathroom-data-primary/H3BoundsCache";
import {
  bathroomLatLongToH3Cell,
  h3CellToPostgisPolygon,
} from "../app/_server/pure/geospatial/BathroomH3Cells";
import { H3_BATHROOM_CELL_RESOLUTION } from "../app/_server/ServerConstants";
import { disconnectRedisTestGlobals } from "./disconnectRedisTestGlobals";
import { requireLocalSupabaseEnv } from "./requireLocalSupabase";

const createdBathroomIds: number[] = [];

describe("bathroom_data_primary H3 cell RPC against local Supabase", () => {
  beforeAll(() => {
    requireLocalSupabaseEnv();
  });

  afterAll(async () => {
    if (createdBathroomIds.length > 0) {
      const { url, key } = requireLocalSupabaseEnv();
      await createClient(url, key)
        .from("bathroom_data_primary")
        .delete()
        .in("id", createdBathroomIds);
    }

    await disconnectRedisTestGlobals();
  });

  test("returns rows for requested cell polygons and omits empty cells", async () => {
    const baseLocation = { latitude: -6.7, longitude: -11.7 };
    const baseCell = bathroomLatLongToH3Cell(
      baseLocation,
      H3_BATHROOM_CELL_RESOLUTION,
    );
    const neighborCell = gridDisk(baseCell, 1).find((cell) => cell !== baseCell);
    expect(neighborCell).toBeDefined();
    if (neighborCell === undefined) return;

    const [neighborLatitude, neighborLongitude] = cellToLatLng(neighborCell);
    const baseRow = await bathroomDbCreate(
      baseLocation.latitude,
      baseLocation.longitude,
    );
    const neighborRow = await bathroomDbCreate(
      neighborLatitude,
      neighborLongitude,
    );
    createdBathroomIds.push(baseRow.id, neighborRow.id);

    const emptyCell = bathroomLatLongToH3Cell(
      { latitude: -80, longitude: 0 },
      H3_BATHROOM_CELL_RESOLUTION,
    );
    const { url, key } = requireLocalSupabaseEnv();
    const { data, error } = await createClient(url, key).rpc(
      GET_BATHROOM_H3_CELLS_RPC_NAME,
      buildBathroomH3CellRpcParams([
        h3CellToPostgisPolygon(baseCell),
        h3CellToPostgisPolygon(neighborCell),
        h3CellToPostgisPolygon(emptyCell),
      ]),
    );

    expect(error).toBeNull();
    const rows = parseBathroomH3CellRpcRows(data);
    expect(rows.map((row) => row.id)).toEqual(
      expect.arrayContaining([baseRow.id, neighborRow.id]),
    );
    expect(rows.some((row) => row.cell === emptyCell)).toBe(false);
  });
});
