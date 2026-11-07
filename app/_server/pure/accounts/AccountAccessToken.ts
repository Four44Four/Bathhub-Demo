/** Reads the `sub` claim from an access token for rate-limit identity. */
export function accountIdFromAccessToken(
  accessToken: string | null | undefined,
): string | null {
  if (accessToken == null) {
    return null;
  }
  const trimmed = accessToken.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const payloadSegment = trimmed.split(".")[1];
  if (payloadSegment === undefined || payloadSegment.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8"),
    ) as { sub?: unknown };
    return typeof parsed.sub === "string" && parsed.sub.length > 0
      ? parsed.sub
      : null;
  } catch {
    return null;
  }
}

/** Bearer token from an Authorization header, or null when the header is absent. */
export function accessTokenFromAuthorizationHeader(
  authorizationHeader: string | null | undefined,
): string | null {
  if (authorizationHeader == null) {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}
