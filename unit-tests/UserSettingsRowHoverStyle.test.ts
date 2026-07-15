import {
  userSettingsRowHoverBrightnessFactor,
  userSettingsRowHoverFilter,
  userSettingsRowHoverFilterTransition,
  userSettingsRowHoverStyle,
} from "../app/_client/pure/user-settings/UserSettingsRowHoverStyle";

describe("UserSettingsRowHoverStyle", () => {
  test("userSettingsRowHoverBrightnessFactor returns hover factor when hovered", () => {
    expect(userSettingsRowHoverBrightnessFactor(true, false, 0.8)).toBe(0.8);
  });

  test("userSettingsRowHoverBrightnessFactor returns 1 when not hovered", () => {
    expect(userSettingsRowHoverBrightnessFactor(false, false, 0.8)).toBe(1);
  });

  test("userSettingsRowHoverBrightnessFactor ignores hover when disabled", () => {
    expect(userSettingsRowHoverBrightnessFactor(true, true, 0.8)).toBe(1);
  });

  test("userSettingsRowHoverFilter formats brightness", () => {
    expect(userSettingsRowHoverFilter(0.8)).toBe("brightness(0.8)");
    expect(userSettingsRowHoverFilter(1)).toBe("brightness(1)");
  });

  test("userSettingsRowHoverFilterTransition formats duration", () => {
    expect(userSettingsRowHoverFilterTransition(150)).toBe("filter 150ms ease");
  });

  test("userSettingsRowHoverStyle includes page background for filter dimming", () => {
    expect(userSettingsRowHoverStyle(0.8, "#FFFFFF", 150)).toEqual({
      backgroundColor: "#FFFFFF",
      filter: "brightness(0.8)",
      transition: "filter 150ms ease",
    });
  });
});
