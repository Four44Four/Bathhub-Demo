import {
  isClientGeolocationAccessible,
  shouldApplyStoredGeoFixOnLoad,
  shouldDiscardStoredGeoFixOnLoad,
} from "../app/_client/pure/globe/ClientGeolocationAccess";
import {
  shouldPauseBathroomActiveNavigation,
  shouldResumeBathroomActiveNavigation,
} from "../app/_client/pure/viewport2d/BathroomActiveNavigationPausePolicy";

describe("ClientGeolocationAccess", () => {
  test("treats granted geo ref as accessible", () => {
    expect(
      isClientGeolocationAccessible({
        isClientGeoGranted: true,
        mapInitLat: 1,
        mapInitLong: 2,
      }),
    ).toBe(true);
    expect(
      isClientGeolocationAccessible({
        isClientGeoGranted: false,
        mapInitLat: 1,
        mapInitLong: 2,
      }),
    ).toBe(false);
  });

  test("applies stored geo fix only when permission is granted or unknown", () => {
    expect(shouldApplyStoredGeoFixOnLoad("granted")).toBe(true);
    expect(shouldApplyStoredGeoFixOnLoad("unknown")).toBe(true);
    expect(shouldApplyStoredGeoFixOnLoad("denied")).toBe(false);
    expect(shouldApplyStoredGeoFixOnLoad("prompt")).toBe(false);
  });

  test("discards stored geo fix when permission is denied", () => {
    expect(shouldDiscardStoredGeoFixOnLoad("denied")).toBe(true);
    expect(shouldDiscardStoredGeoFixOnLoad("granted")).toBe(false);
  });
});

describe("BathroomActiveNavigationPausePolicy", () => {
  const activeNavigation = {
    targetBathroomId: 1,
    targetLatitude: 2,
    targetLongitude: 3,
  };

  test("pauses when navigation is active but geolocation is unavailable", () => {
    expect(
      shouldPauseBathroomActiveNavigation(activeNavigation, {
        isClientGeoGranted: false,
        mapInitLat: 0,
        mapInitLong: 0,
      }),
    ).toBe(true);
    expect(shouldPauseBathroomActiveNavigation(null, {
      isClientGeoGranted: false,
      mapInitLat: 0,
      mapInitLong: 0,
    })).toBe(false);
  });

  test("resumes when geolocation becomes accessible again", () => {
    expect(
      shouldResumeBathroomActiveNavigation(
        activeNavigation,
        true,
        {
          isClientGeoGranted: true,
          mapInitLat: 1,
          mapInitLong: 2,
        },
      ),
    ).toBe(true);
    expect(
      shouldResumeBathroomActiveNavigation(
        activeNavigation,
        false,
        {
          isClientGeoGranted: true,
          mapInitLat: 1,
          mapInitLong: 2,
        },
      ),
    ).toBe(false);
  });
});
