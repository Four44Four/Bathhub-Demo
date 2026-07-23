import {
  bathroomMarkerIdFromDrillPick,
  bathroomMarkerIdFromEntityName,
  bathroomMarkerIdFromPick,
} from "../app/_client/pure/bathroom/BathroomMarkerPick";

describe("BathroomMarkerPick", () => {
  test("bathroomMarkerIdFromEntityName parses BathroomMarker-{id} names", () => {
    expect(bathroomMarkerIdFromEntityName("BathroomMarker-42")).toBe(42);
    expect(bathroomMarkerIdFromEntityName("BathroomMarker-0")).toBe(0);
  });

  test("bathroomMarkerIdFromEntityName rejects non-marker names", () => {
    expect(bathroomMarkerIdFromEntityName("MapMarker")).toBeNull();
    expect(bathroomMarkerIdFromEntityName("BathroomMarker-")).toBeNull();
    expect(bathroomMarkerIdFromEntityName(undefined)).toBeNull();
  });

  test("bathroomMarkerIdFromPick reads a direct entity pick", () => {
    expect(bathroomMarkerIdFromPick({ name: "BathroomMarker-7" })).toBe(7);
    expect(bathroomMarkerIdFromPick(null)).toBeNull();
    expect(bathroomMarkerIdFromPick({ name: "ClickedIndicator" })).toBeNull();
  });

  test("bathroomMarkerIdFromPick reads entity billboards via picked.id", () => {
    expect(
      bathroomMarkerIdFromPick({
        primitive: {},
        id: { name: "BathroomMarker-12" },
      }),
    ).toBe(12);
  });

  test("bathroomMarkerIdFromPick reads entity billboards via picked.primitive.id", () => {
    expect(
      bathroomMarkerIdFromPick({
        primitive: { id: { name: "BathroomMarker-3" } },
      }),
    ).toBe(3);
  });

  test("bathroomMarkerIdFromDrillPick returns the first bathroom marker in the stack", () => {
    expect(
      bathroomMarkerIdFromDrillPick([
        { primitive: {} },
        { id: { name: "BathroomMarker-99" } },
        { id: { name: "BathroomMarker-1" } },
      ]),
    ).toBe(99);
  });
});
