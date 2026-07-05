import {
  formatMissingRequiredEnvVarsMessage,
  getMissingRequiredEnvVars,
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  REDIS_URL_ENV,
  REQUIRED_SERVER_ENV_VAR_NAMES,
  SUPABASE_KEY_ENV,
  SUPABASE_URL_ENV,
} from "../app/_server/pure/RequiredEnvVars";

describe("RequiredEnvVars", () => {
  test("REQUIRED_SERVER_ENV_VAR_NAMES lists all documented server env vars", () => {
    expect(REQUIRED_SERVER_ENV_VAR_NAMES).toEqual([
      OPEN_ROUTE_SERVICE_API_KEY_ENV,
      SUPABASE_URL_ENV,
      SUPABASE_KEY_ENV,
      REDIS_URL_ENV,
    ]);
  });

  test("getMissingRequiredEnvVars returns empty when all required vars are set", () => {
    expect(
      getMissingRequiredEnvVars({
        [OPEN_ROUTE_SERVICE_API_KEY_ENV]: "ors-key",
        [SUPABASE_URL_ENV]: "http://127.0.0.1:54331",
        [SUPABASE_KEY_ENV]: "supabase-key",
        [REDIS_URL_ENV]: "redis://127.0.0.1:6380",
      }),
    ).toEqual([]);
  });

  test("getMissingRequiredEnvVars reports undefined and empty values", () => {
    expect(
      getMissingRequiredEnvVars({
        [OPEN_ROUTE_SERVICE_API_KEY_ENV]: "ors-key",
        [SUPABASE_URL_ENV]: "",
        [SUPABASE_KEY_ENV]: undefined,
        [REDIS_URL_ENV]: "redis://127.0.0.1:6380",
      }),
    ).toEqual([SUPABASE_URL_ENV, SUPABASE_KEY_ENV]);
  });

  test("formatMissingRequiredEnvVarsMessage lists each missing variable", () => {
    expect(
      formatMissingRequiredEnvVarsMessage([SUPABASE_URL_ENV, REDIS_URL_ENV]),
    ).toBe(
      "Missing or non-usable environment variables:\n  - SUPABASE_URL: missing\n  - REDIS_URL: missing",
    );
  });
});
