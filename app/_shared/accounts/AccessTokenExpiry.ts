const ACCESS_TOKEN_EXPIRY_SKEW_MS = 30_000;

/** Reads the `exp` claim (seconds) from a JWT access token. */
export function accessTokenExpiresAtMs(accessToken: string): number | null {
  const payloadSegment = accessToken.trim().split(".")[1];
  if (payloadSegment == null || payloadSegment.length === 0) {
    return null;
  }
  try {
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(payloadSegment, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { exp?: unknown };
    return typeof parsed.exp === "number" && Number.isFinite(parsed.exp)
      ? parsed.exp * 1000
      : null;
  } catch {
    return null;
  }
}

/** True when the token is missing exp or expires within the skew window. */
export function accessTokenIsExpired(
  accessToken: string,
  nowMs: number = Date.now(),
  skewMs: number = ACCESS_TOKEN_EXPIRY_SKEW_MS,
): boolean {
  const expiresAtMs = accessTokenExpiresAtMs(accessToken);
  if (expiresAtMs == null) {
    return true;
  }
  return nowMs >= expiresAtMs - skewMs;
}
