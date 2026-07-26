import {
  shouldDisplayBathroomMarkerOnMap,
  filterRenderedBathroomsForMapDisplay,
} from "../app/_client/pure/bathroom/BathroomMapMarkerVisibility";
import type { RenderedBathroomEntry } from "../app/_client/pure/bathroom/RenderedBathrooms";

function entry(
  overrides: Partial<RenderedBathroomEntry> & Pick<RenderedBathroomEntry, "id">,
): RenderedBathroomEntry {
  return {
    latitude: 0,
    longitude: 0,
    version: 1,
    existence_value: 1,
    deletion_wait_started_timestamp: null,
    verify_status: "verified",
    loadedFromCache: true,
    ...overrides,
  };
}

const showAll = {
  show_non_verified_bathrooms_on_map: true,
  show_pending_deletion_bathrooms_on_map: true,
} as const;

const hideNonVerified = {
  show_non_verified_bathrooms_on_map: false,
  show_pending_deletion_bathrooms_on_map: true,
} as const;

const hidePendingDeletion = {
  show_non_verified_bathrooms_on_map: true,
  show_pending_deletion_bathrooms_on_map: false,
} as const;

describe("shouldDisplayBathroomMarkerOnMap", () => {
  test("shows verified and pending-verify bathrooms when both settings are true", () => {
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({ id: 1, existence_value: 2 }),
        showAll,
      ),
    ).toBe(true);
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({ id: 2, existence_value: 0 }),
        showAll,
      ),
    ).toBe(true);
  });

  test("hides non-verified bathrooms when show_non_verified_bathrooms_on_map is false", () => {
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({ id: 1, existence_value: 0 }),
        hideNonVerified,
      ),
    ).toBe(false);
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({ id: 2, existence_value: -1 }),
        hideNonVerified,
      ),
    ).toBe(false);
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({ id: 3, existence_value: 0.0001 }),
        hideNonVerified,
      ),
    ).toBe(true);
  });

  test("hides pending-deletion bathrooms when show_pending_deletion_bathrooms_on_map is false", () => {
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({
          id: 1,
          deletion_wait_started_timestamp: "2026-01-01T00:00:00.000Z",
        }),
        hidePendingDeletion,
      ),
    ).toBe(false);
    expect(
      shouldDisplayBathroomMarkerOnMap(
        entry({ id: 2, deletion_wait_started_timestamp: null }),
        hidePendingDeletion,
      ),
    ).toBe(true);
  });
});

describe("filterRenderedBathroomsForMapDisplay", () => {
  test("filters entries according to both visibility settings", () => {
    const bathrooms = [
      entry({ id: 1, existence_value: 2 }),
      entry({ id: 2, existence_value: 0 }),
      entry({
        id: 3,
        existence_value: 1,
        deletion_wait_started_timestamp: "2026-01-01T00:00:00.000Z",
      }),
    ];

    expect(filterRenderedBathroomsForMapDisplay(bathrooms, showAll)).toEqual(
      bathrooms,
    );
    expect(
      filterRenderedBathroomsForMapDisplay(bathrooms, hideNonVerified).map(
        (b) => b.id,
      ),
    ).toEqual([1, 3]);
    expect(
      filterRenderedBathroomsForMapDisplay(bathrooms, hidePendingDeletion).map(
        (b) => b.id,
      ),
    ).toEqual([1, 2]);
    expect(
      filterRenderedBathroomsForMapDisplay(bathrooms, {
        show_non_verified_bathrooms_on_map: false,
        show_pending_deletion_bathrooms_on_map: false,
      }).map((b) => b.id),
    ).toEqual([1]);
  });
});
