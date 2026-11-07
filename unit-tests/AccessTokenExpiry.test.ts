import {
  accessTokenExpiresAtMs,
  accessTokenIsExpired,
} from "../app/_shared/accounts/AccessTokenExpiry";

function tokenWithExp(expSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString(
    "base64url",
  );
  return `hdr.${payload}.sig`;
}

describe("access token expiry", () => {
  test("reads exp and treats near-expiry tokens as expired", () => {
    const expiresAt = Math.floor(Date.UTC(2026, 10, 7, 12, 0, 0) / 1000);
    const token = tokenWithExp(expiresAt);
    expect(accessTokenExpiresAtMs(token)).toBe(expiresAt * 1000);
    expect(
      accessTokenIsExpired(token, Date.UTC(2026, 10, 7, 11, 59, 40), 30_000),
    ).toBe(true);
    expect(
      accessTokenIsExpired(token, Date.UTC(2026, 10, 7, 11, 59, 20), 30_000),
    ).toBe(false);
  });

  test("rejects malformed tokens", () => {
    expect(accessTokenExpiresAtMs("not-a-jwt")).toBeNull();
    expect(accessTokenIsExpired("not-a-jwt")).toBe(true);
  });
});
