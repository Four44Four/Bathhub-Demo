import { BathroomMapMarker } from "../app/_client/ComponentConstants";
import { markerImageForStatus } from "../app/_client/globe/BathroomMarkers";

describe("markerImageForStatus", () => {
  test("selects pending, verified, and pending-deletion marker images", () => {
    expect(markerImageForStatus("pending")).toBe(BathroomMapMarker.PENDING_IMAGE);
    expect(markerImageForStatus("verified")).toBe(BathroomMapMarker.VERIFIED_IMAGE);
    expect(markerImageForStatus("pending-deletion")).toBe(
      BathroomMapMarker.PENDING_DELETION_IMAGE,
    );
  });
});
