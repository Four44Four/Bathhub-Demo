import { userSettingsBreadcrumbSegments } from "../app/_shared/user-settings/UserSettingsBreadcrumb";

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
