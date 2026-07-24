import {
  bathroomPageDropdownWidthPx,
  bathroomPageDropdownXPx,
  dropdownMenuArrowRotationDeg,
  dropdownMenuPanelHeightPx,
  dropdownMenuQuadraticEase,
} from "../app/_client/pure/dropdown-menu/DropdownMenuLayout";

describe("dropdownMenuQuadraticEase", () => {
  test("returns 0 at start and 1 at end", () => {
    expect(dropdownMenuQuadraticEase(0)).toBe(0);
    expect(dropdownMenuQuadraticEase(1)).toBe(1);
  });
});

describe("dropdownMenuArrowRotationDeg", () => {
  test("points right when collapsed and down when expanded", () => {
    expect(dropdownMenuArrowRotationDeg(0)).toBe(0);
    expect(dropdownMenuArrowRotationDeg(1)).toBe(90);
  });
});

describe("dropdownMenuPanelHeightPx", () => {
  test("scales height with eased progress", () => {
    expect(dropdownMenuPanelHeightPx(0, 200)).toBe(0);
    expect(dropdownMenuPanelHeightPx(1, 200)).toBe(200);
  });
});

describe("bathroom page dropdown layout", () => {
  test("computes right-half width and x offset", () => {
    expect(bathroomPageDropdownWidthPx(400, 10)).toBe(180);
    expect(bathroomPageDropdownXPx(400, 10)).toBe(210);
  });
});
