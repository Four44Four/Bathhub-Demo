import {
  userSettingsBreadcrumbSegments,
  userSettingsBreadcrumbTitle,
} from "../app/_shared/user-settings/UserSettingsBreadcrumb";

describe("userSettingsBreadcrumbSegments", () => {
  test("root page shows Settings only", () => {
    expect(userSettingsBreadcrumbSegments(["root"])).toEqual(["Settings"]);
    expect(userSettingsBreadcrumbSegments([])).toEqual(["Settings"]);
  });

  test("nested subpage includes breadcrumb trail", () => {
    expect(userSettingsBreadcrumbSegments(["root", "bathroom"])).toEqual([
      "Settings",
      "Bathroom settings",
    ]);
  });
});

describe("userSettingsBreadcrumbTitle", () => {
  test("root page shows Settings only", () => {
    expect(userSettingsBreadcrumbTitle(["root"])).toBe("Settings");
    expect(userSettingsBreadcrumbTitle([])).toBe("Settings");
  });

  test("nested subpage shows breadcrumb trail", () => {
    expect(userSettingsBreadcrumbTitle(["root", "bathroom"])).toBe(
      "Settings > Bathroom settings",
    );
  });
});
