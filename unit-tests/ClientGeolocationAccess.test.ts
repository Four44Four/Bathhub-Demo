import {
  isClientGeolocationAccessible,
  readGeolocationPermissionState,
  shouldApplyStoredGeoFixOnLoad,
  shouldDiscardStoredGeoFixOnLoad,
} from "../app/_client/pure/globe/ClientGeolocationAccess";

describe("ClientGeolocationAccess", () => {
  describe("isClientGeolocationAccessible", () => {
    test("returns true when geolocation permission is granted", () => {
      expect(isClientGeolocationAccessible({ isClientGeoGranted: true, mapInitLat: 0, mapInitLong: 0 })).toBe(
        true,
      );
    });

    test("returns false when geolocation permission is not granted", () => {
      expect(isClientGeolocationAccessible({ isClientGeoGranted: false, mapInitLat: 0, mapInitLong: 0 })).toBe(
        false,
      );
    });
  });

  describe("shouldApplyStoredGeoFixOnLoad", () => {
    test("returns true for granted permission", () => {
      expect(shouldApplyStoredGeoFixOnLoad("granted")).toBe(true);
    });

    test("returns true for unknown permission (Permissions API unavailable)", () => {
      expect(shouldApplyStoredGeoFixOnLoad("unknown")).toBe(true);
    });

    test("returns false for prompt and denied permission", () => {
      expect(shouldApplyStoredGeoFixOnLoad("prompt")).toBe(false);
      expect(shouldApplyStoredGeoFixOnLoad("denied")).toBe(false);
    });
  });

  describe("shouldDiscardStoredGeoFixOnLoad", () => {
    test("returns true only when permission is denied", () => {
      expect(shouldDiscardStoredGeoFixOnLoad("denied")).toBe(true);
      expect(shouldDiscardStoredGeoFixOnLoad("granted")).toBe(false);
      expect(shouldDiscardStoredGeoFixOnLoad("prompt")).toBe(false);
      expect(shouldDiscardStoredGeoFixOnLoad("unknown")).toBe(false);
    });
  });

  describe("readGeolocationPermissionState", () => {
    const originalPermissions = navigator.permissions;

    afterEach(() => {
      Object.defineProperty(navigator, "permissions", {
        value: originalPermissions,
        configurable: true,
      });
    });

    test("returns unknown when Permissions API is unavailable", async () => {
      Object.defineProperty(navigator, "permissions", {
        value: undefined,
        configurable: true,
      });
      expect(await readGeolocationPermissionState()).toBe("unknown");
    });

    test("maps PermissionStatus.state to GeolocationPermissionState", async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce({ state: "granted" })
        .mockResolvedValueOnce({ state: "denied" })
        .mockResolvedValueOnce({ state: "prompt" });

      Object.defineProperty(navigator, "permissions", {
        value: { query },
        configurable: true,
      });

      expect(await readGeolocationPermissionState()).toBe("granted");
      expect(await readGeolocationPermissionState()).toBe("denied");
      expect(await readGeolocationPermissionState()).toBe("prompt");
      expect(query).toHaveBeenCalledWith({ name: "geolocation" });
    });

    test("returns unknown when permissions.query throws", async () => {
      Object.defineProperty(navigator, "permissions", {
        value: {
          query: jest.fn().mockRejectedValue(new Error("unsupported")),
        },
        configurable: true,
      });
      expect(await readGeolocationPermissionState()).toBe("unknown");
    });
  });
});
