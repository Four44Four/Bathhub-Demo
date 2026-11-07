import { LoginPage } from "../app/_client/ComponentConstants";
import {
  loginPasswordInputType,
  loginPasswordRevealIcon,
} from "../app/_client/pure/swipeup/LoginPasswordField";

describe("loginPasswordInputType", () => {
  test("hides the password until it is revealed", () => {
    expect(loginPasswordInputType(false)).toBe("password");
    expect(loginPasswordInputType(true)).toBe("text");
  });
});

describe("loginPasswordRevealIcon", () => {
  test("shows the visible icon while hidden and the nonvisible icon when revealed", () => {
    expect(
      loginPasswordRevealIcon(
        false,
        LoginPage.VISIBLE_ICON,
        LoginPage.NONVISIBLE_ICON,
      ),
    ).toBe(LoginPage.VISIBLE_ICON);
    expect(
      loginPasswordRevealIcon(
        true,
        LoginPage.VISIBLE_ICON,
        LoginPage.NONVISIBLE_ICON,
      ),
    ).toBe(LoginPage.NONVISIBLE_ICON);
  });
});

describe("LoginPage constants match login_page.md", () => {
  test("colors, border, placeholders, and reveal icons match the spec", () => {
    expect(LoginPage.ACCENT_COLOR).toBe("#BDBDDE");
    expect(LoginPage.SECONDARY_COLOR).toBe("#FFFFFF");
    expect(LoginPage.BUTTON_BORDER_WIDTH_PX).toBe(1);
    expect(LoginPage.BUTTON_HOVER_ANIMATION_DURATION_MS).toBe(250);
    expect(LoginPage.BUTTON_HOVER_INTERACT_DARKENING_MULT_FACTOR).toBe(0.7);
    expect(LoginPage.USERNAME_PLACEHOLDER).toBe("Username...");
    expect(LoginPage.PASSWORD_PLACEHOLDER).toBe("Password...");
    expect(LoginPage.VISIBLE_ICON).toEqual({
      path: "/visible.svg",
      type: "mono-color",
      monoColor: "#BDBDDE",
    });
    expect(LoginPage.NONVISIBLE_ICON).toEqual({
      path: "/nonvisible.svg",
      type: "mono-color",
      monoColor: "#BDBDDE",
    });
  });
});
