/** Password field reveal state (see specifications/swipe_up_menu/login_page.md). */

export function loginPasswordInputType(
  passwordVisible: boolean,
): "password" | "text" {
  if (passwordVisible) {
    return "text";
  }
  return "password";
}

/**
 * Visible icon while the password is hidden; nonvisible icon once it is revealed.
 */
export function loginPasswordRevealIcon<TIcon>(
  passwordVisible: boolean,
  visibleIcon: TIcon,
  nonvisibleIcon: TIcon,
): TIcon {
  if (passwordVisible) {
    return nonvisibleIcon;
  }
  return visibleIcon;
}
