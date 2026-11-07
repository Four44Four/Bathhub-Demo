"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEventHandler,
} from "react";

import { LoginPage as LoginPageConsts } from "../ComponentConstants";
import { resolveImageMonoColor } from "../pure/Image";
import {
  loginPasswordInputType,
  loginPasswordRevealIcon,
} from "../pure/swipeup/LoginPasswordField";
import { viewportButtonDarkenInteractColorsAtProgress } from "../pure/viewport2d/ButtonInteractColor";
import { blackMonoIconCssFilter } from "../pure/svg/BlackMonoIconCssFilter";
import { TextWeight } from "../Utils";
import { useAnimatedLinear01 } from "../useAnimatedLinear01";
import { useAccountSession } from "../accounts/AccountSessionContext";
import { useReportRateLimitViolation } from "../pure/rate-limit/useReportRateLimitViolation";
import { useSwipeMenuPage } from "./SwipeMenuPageContext";

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `${LoginPageConsts.BUTTON_BORDER_WIDTH_PX}px solid ${LoginPageConsts.ACCENT_COLOR}`,
  backgroundColor: LoginPageConsts.SECONDARY_COLOR,
  color: "#1C1D22",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
};

function LoginActionButton({
  label,
  type,
  fillColor,
  lineColor,
  disabled,
  onClick,
}: {
  label: string;
  type: "button" | "submit";
  fillColor: string;
  lineColor: string;
  disabled: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isHighlighted = (isHovered || isPressed) && !disabled;
  const interactProgress = useAnimatedLinear01(
    isHighlighted ? 1 : 0,
    LoginPageConsts.BUTTON_HOVER_ANIMATION_DURATION_MS,
  );
  const {
    fillColor: resolvedFillColor,
    outlineColor: resolvedLineColor,
    textColor: resolvedTextColor,
  } = viewportButtonDarkenInteractColorsAtProgress(
    fillColor,
    lineColor,
    lineColor,
    interactProgress,
    LoginPageConsts.BUTTON_HOVER_INTERACT_DARKENING_MULT_FACTOR,
  );

  const buttonStyle: CSSProperties = {
    flex: 1,
    border: `${LoginPageConsts.BUTTON_BORDER_WIDTH_PX}px solid ${resolvedLineColor}`,
    backgroundColor: resolvedFillColor,
    color: resolvedTextColor,
    borderRadius: 8,
    padding: "10px 12px",
    cursor: disabled ? "default" : "pointer",
  };

  return (
    <button
      type={type}
      className={TextWeight.BOLD}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      style={buttonStyle}
    >
      {label}
    </button>
  );
}

/** Login and registration page (see specifications/swipe_up_menu/login_page.md). */
export function LoginPage() {
  const { login, register } = useAccountSession();
  const { navigateToPage } = useSwipeMenuPage();
  const reportRateLimitViolation = useReportRateLimitViolation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"login" | "register" | null>(
    null,
  );

  const revealIcon = loginPasswordRevealIcon(
    passwordVisible,
    LoginPageConsts.VISIBLE_ICON,
    LoginPageConsts.NONVISIBLE_ICON,
  );
  const revealIconFilter = useMemo(() => {
    const monoColor =
      resolveImageMonoColor(revealIcon) ?? LoginPageConsts.ACCENT_COLOR;
    return blackMonoIconCssFilter(monoColor);
  }, [revealIcon]);

  async function submit(action: "login" | "register") {
    setPendingAction(action);
    setErrorMessage(null);
    const error =
      action === "login"
        ? await login(username, password)
        : await register(username, password);
    setPendingAction(null);
    if (error !== null) {
      if (reportRateLimitViolation(error)) {
        return;
      }
      setErrorMessage(error);
      return;
    }
    navigateToPage("account");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("login");
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: LoginPageConsts.STACK_GAP_PX,
        padding: LoginPageConsts.PADDING_PX,
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <input
        aria-label="Username"
        autoComplete="username"
        placeholder={LoginPageConsts.USERNAME_PLACEHOLDER}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        style={fieldStyle}
      />
      <div style={{ position: "relative", width: "100%" }}>
        <input
          aria-label="Password"
          autoComplete="current-password"
          placeholder={LoginPageConsts.PASSWORD_PLACEHOLDER}
          type={loginPasswordInputType(passwordVisible)}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            ...fieldStyle,
            paddingRight: LoginPageConsts.PASSWORD_FIELD_PADDING_RIGHT_PX,
          }}
        />
        <button
          type="button"
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          onClick={() => setPasswordVisible((current) => !current)}
          style={{
            position: "absolute",
            right: LoginPageConsts.PASSWORD_REVEAL_ICON_INSET_PX,
            top: "50%",
            transform: "translateY(-50%)",
            width: LoginPageConsts.PASSWORD_REVEAL_ICON_SIZE_PX,
            height: LoginPageConsts.PASSWORD_REVEAL_ICON_SIZE_PX,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={revealIcon.path}
            alt=""
            draggable={false}
            width={LoginPageConsts.PASSWORD_REVEAL_ICON_SIZE_PX}
            height={LoginPageConsts.PASSWORD_REVEAL_ICON_SIZE_PX}
            style={{
              width: LoginPageConsts.PASSWORD_REVEAL_ICON_SIZE_PX,
              height: LoginPageConsts.PASSWORD_REVEAL_ICON_SIZE_PX,
              objectFit: "contain",
              filter: revealIconFilter,
              pointerEvents: "none",
            }}
          />
        </button>
      </div>
      {errorMessage !== null ? (
        <p style={{ margin: 0, color: "#DB6F81", fontSize: 13 }}>{errorMessage}</p>
      ) : null}
      <div style={{ display: "flex", width: "100%", gap: 8 }}>
        <LoginActionButton
          type="button"
          label="Register"
          fillColor={LoginPageConsts.SECONDARY_COLOR}
          lineColor={LoginPageConsts.ACCENT_COLOR}
          disabled={pendingAction !== null}
          onClick={() => {
            void submit("register");
          }}
        />
        <LoginActionButton
          type="submit"
          label="Login"
          fillColor={LoginPageConsts.ACCENT_COLOR}
          lineColor={LoginPageConsts.SECONDARY_COLOR}
          disabled={pendingAction !== null}
        />
      </div>
    </form>
  );
}
