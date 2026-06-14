import {
  truncateTextTailToFitWidthPx,
  userSettingsBreadcrumbPlainText,
  userSettingsBreadcrumbSegmentsWidthPx,
} from "../app/_client/pure/user-settings/UserSettingsBreadcrumbDisplay";

describe("userSettingsBreadcrumbPlainText", () => {
  test("joins segments with separators", () => {
    expect(userSettingsBreadcrumbPlainText(["Settings", "Bathroom settings"])).toBe(
      "Settings > Bathroom settings",
    );
  });
});

describe("userSettingsBreadcrumbSegmentsWidthPx", () => {
  test("sums segment and separator widths", () => {
    const width = userSettingsBreadcrumbSegmentsWidthPx(
      ["Settings", "Bathroom settings"],
      (text) => text.length * 10,
      (text) => text.length * 10,
    );
    expect(width).toBe(8 * 10 + 3 * 10 + 17 * 10);
  });
});

describe("truncateTextTailToFitWidthPx", () => {
  const measure = (text: string) => text.length;

  test("returns full text when it already fits", () => {
    expect(truncateTextTailToFitWidthPx("Settings", 20, measure)).toBe("Settings");
  });

  test("keeps the tail and prefixes an ellipsis", () => {
    const full = "Settings > SubsettingsPage0 > SubsettingsPage1 > SubsettingsPage2";
    expect(truncateTextTailToFitWidthPx(full, 18, measure)).toBe("...ubsettingsPage2");
  });

  test("returns the longest fitting tail", () => {
    expect(truncateTextTailToFitWidthPx("abcdefghij", 7, measure)).toBe("...ghij");
  });
});
