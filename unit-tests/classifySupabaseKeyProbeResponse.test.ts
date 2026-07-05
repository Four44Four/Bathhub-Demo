import {
  classifySupabaseKeyProbeResponse,
  formatSupabaseKeyProbeDetail,
} from "../app/_server/pure/classifySupabaseKeyProbeResponse";

describe("classifySupabaseKeyProbeResponse", () => {
  test("accepts valid publishable keys that return missing sub claim", () => {
    expect(
      classifySupabaseKeyProbeResponse(403, {
        code: 403,
        error_code: "bad_jwt",
        msg: "invalid claim: missing sub claim",
      }),
    ).toBe("ok");
  });

  test("rejects keys that GoTrue reports as unauthorized", () => {
    expect(
      classifySupabaseKeyProbeResponse(401, {
        code: 401,
        error_code: "no_authorization",
        msg: "This endpoint requires a valid Bearer token",
      }),
    ).toBe("unauthenticated");
  });

  test("rejects malformed JWT-like keys", () => {
    expect(
      classifySupabaseKeyProbeResponse(403, {
        code: 403,
        error_code: "bad_jwt",
        msg: "invalid JWT: unable to parse or verify signature",
      }),
    ).toBe("unauthenticated");
  });

  test("treats 5xx responses as server errors", () => {
    expect(classifySupabaseKeyProbeResponse(503, {})).toBe("server_error");
  });

  test("formatSupabaseKeyProbeDetail includes error code and message", () => {
    expect(
      formatSupabaseKeyProbeDetail({
        error_code: "no_authorization",
        msg: "This endpoint requires a valid Bearer token",
      }),
    ).toBe(
      "no_authorization: This endpoint requires a valid Bearer token",
    );
  });
});
