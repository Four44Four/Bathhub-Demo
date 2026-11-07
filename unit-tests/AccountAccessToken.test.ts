import {
  accessTokenFromAuthorizationHeader,
  accountIdFromAccessToken,
} from "../app/_server/pure/accounts/AccountAccessToken";

function tokenWithPayload(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `header.${encoded}.signature`;
}

describe("account access token subject", () => {
  test("accountIdFromAccessToken reads a non-empty sub claim", () => {
    const accountId = "11111111-1111-1111-1111-111111111111";
    expect(accountIdFromAccessToken(tokenWithPayload({ sub: accountId }))).toBe(
      accountId,
    );
    expect(accountIdFromAccessToken(tokenWithPayload({ sub: "" }))).toBeNull();
    expect(accountIdFromAccessToken("not-a-jwt")).toBeNull();
    expect(accountIdFromAccessToken(null)).toBeNull();
  });

  test("accessTokenFromAuthorizationHeader accepts a bearer token", () => {
    expect(accessTokenFromAuthorizationHeader("Bearer abc.def.ghi")).toBe(
      "abc.def.ghi",
    );
    expect(accessTokenFromAuthorizationHeader("Basic abc")).toBeNull();
    expect(accessTokenFromAuthorizationHeader(null)).toBeNull();
  });
});
