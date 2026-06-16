import {
  currentUserSettingsPageId,
  popUserSettingsPage,
  pushUserSettingsPage,
} from "../app/_shared/user-settings/UserSettingsPageStack";

describe("UserSettingsPageStack", () => {
  test("pushPage appends a subsettings page", () => {
    expect(pushUserSettingsPage(["root"], "bathroom")).toEqual([
      "root",
      "bathroom",
    ]);
  });

  test("popPage returns to the previous page but never below root", () => {
    expect(popUserSettingsPage(["root", "bathroom"])).toEqual(["root"]);
    expect(popUserSettingsPage(["root"])).toEqual(["root"]);
  });

  test("currentUserSettingsPageId reads the tail of the stack", () => {
    expect(currentUserSettingsPageId(["root", "bathroom"])).toBe("bathroom");
    expect(currentUserSettingsPageId(["root"])).toBe("root");
    expect(currentUserSettingsPageId([])).toBe("root");
  });
});
