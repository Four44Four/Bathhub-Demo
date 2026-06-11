import {
  bathroomMarkerBillboardTint,
  darkenCssHexColor,
} from "../app/_client/pure/bathroom/BathroomMarkerTint";

describe("BathroomMarkerTint", () => {
  test("darkenCssHexColor scales rgb channels", () => {
    expect(darkenCssHexColor("#FFFFFF", 0.5)).toBe("#808080");
    expect(darkenCssHexColor("#FFF", 0.5)).toBe("#808080");
  });

  test("bathroomMarkerBillboardTint keeps cache-loaded markers at base tint", () => {
    expect(
      bathroomMarkerBillboardTint(true, {
        baseColor: "#FFFFFF",
        baseOpacity: 1,
        debugCacheLoadedMarker: true,
      }),
    ).toEqual({ color: "#FFFFFF", opacity: 1 });
  });

  test("bathroomMarkerBillboardTint darkens non-cache markers when debug is enabled", () => {
    expect(
      bathroomMarkerBillboardTint(false, {
        baseColor: "#FFFFFF",
        baseOpacity: 1,
        debugCacheLoadedMarker: true,
        notFromCacheDarkenFactor: 0.5,
      }),
    ).toEqual({ color: "#808080", opacity: 1 });
  });

  test("bathroomMarkerBillboardTint ignores cache state when debug is disabled", () => {
    expect(
      bathroomMarkerBillboardTint(false, {
        baseColor: "#FFFFFF",
        baseOpacity: 1,
        debugCacheLoadedMarker: false,
      }),
    ).toEqual({ color: "#FFFFFF", opacity: 1 });
  });
});
