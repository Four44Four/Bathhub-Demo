import {
  bathroomLatLongToH3Cell,
  dedupeBathroomRowsById,
  estimateViewportH3CellCount,
  filterRowsToViewportBounds,
  h3CellToPostgisPolygon,
  viewportBoundsToH3Cells,
} from "../app/_server/pure/geospatial/BathroomH3Cells";
import { H3_BATHROOM_CELL_RESOLUTION } from "../app/_server/ServerConstants";
import { type BathroomDataPrimaryRow } from "../app/_shared/BathroomDataPrimary";

const sampleRow = (
  id: number,
  latitude: number,
  longitude: number,
): BathroomDataPrimaryRow => ({
  id,
  latitude,
  longitude,
  verify_status: "pending",
  temp_data: "x",
  created_at: "2026-01-01T00:00:00.000Z",
  version: 0,
});

describe("BathroomH3Cells", () => {
  test("bathroomLatLongToH3Cell deterministically assigns coordinates", () => {
    expect(
      bathroomLatLongToH3Cell(
        { latitude: 37.3615593, longitude: -122.0553238 },
        7,
      ),
    ).toBe("87283472bffffff");
  });

  test("viewportBoundsToH3Cells includes the center cell and halo cells", () => {
    const bounds = {
      lowerLeft: { latitude: 37.36155, longitude: -122.05533 },
      upperRight: { latitude: 37.36157, longitude: -122.05531 },
    };
    const centerCell = bathroomLatLongToH3Cell(
      { latitude: 37.36156, longitude: -122.05532 },
      H3_BATHROOM_CELL_RESOLUTION,
    );

    const cells = viewportBoundsToH3Cells(bounds, H3_BATHROOM_CELL_RESOLUTION);

    expect(cells).toContain(centerCell);
    expect(cells.length).toBeGreaterThan(1);
  });

  test("estimateViewportH3CellCount identifies world-sized bounds as too large", () => {
    expect(
      estimateViewportH3CellCount(
        {
          lowerLeft: { latitude: -90, longitude: -180 },
          upperRight: { latitude: 90, longitude: 180 },
        },
        H3_BATHROOM_CELL_RESOLUTION,
      ),
    ).toBeGreaterThan(2500);
  });

  test("h3CellToPostgisPolygon returns closed GeoJSON coordinates", () => {
    const cell = bathroomLatLongToH3Cell(
      { latitude: 37.3615593, longitude: -122.0553238 },
      H3_BATHROOM_CELL_RESOLUTION,
    );

    const result = h3CellToPostgisPolygon(cell);
    const ring = result.polygon.coordinates[0];

    expect(result.cell).toBe(cell);
    expect(result.polygon.type).toBe("Polygon");
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  test("dedupe and exact bounds filtering preserve final bbox semantics", () => {
    const bounds = {
      lowerLeft: { latitude: 10, longitude: 20 },
      upperRight: { latitude: 11, longitude: 21 },
    };
    const rows = [
      sampleRow(1, 10.5, 20.5),
      sampleRow(1, 10.6, 20.6),
      sampleRow(2, 12, 20.5),
    ];

    expect(filterRowsToViewportBounds(dedupeBathroomRowsById(rows), bounds)).toEqual([
      sampleRow(1, 10.6, 20.6),
    ]);
  });
});
