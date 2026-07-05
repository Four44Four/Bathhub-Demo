export type SupabaseKeyProbeBody = {
  code?: string | number;
  error_code?: string;
  message?: string;
  msg?: string;
};

export type SupabaseKeyProbeResult =
  | "ok"
  | "unauthenticated"
  | "server_error";

/**
 * Classifies `GET /auth/v1/user` when probed with the project's API key.
 *
 * Valid anon/publishable keys are accepted by the gateway but are not user
 * session JWTs, so GoTrue responds with 403 `bad_jwt` / "missing sub claim".
 * Rejected keys return 401 `no_authorization` or a different 403 `bad_jwt`.
 */
export function classifySupabaseKeyProbeResponse(
  status: number,
  body: SupabaseKeyProbeBody,
): SupabaseKeyProbeResult {
  const errorCode = normalizeErrorCode(body);

  if (status === 401 || errorCode === "no_authorization") {
    return "unauthenticated";
  }

  if (status === 403 && errorCode === "bad_jwt") {
    const message = getProbeMessage(body).toLowerCase();
    if (message.includes("missing sub claim")) {
      return "ok";
    }

    return "unauthenticated";
  }

  if (status >= 500) {
    return "server_error";
  }

  if (status >= 200 && status < 300) {
    return "ok";
  }

  return "unauthenticated";
}

export function formatSupabaseKeyProbeDetail(
  body: SupabaseKeyProbeBody,
): string {
  const errorCode = normalizeErrorCode(body);
  const message = getProbeMessage(body);
  if (errorCode.length > 0 && message.length > 0) {
    return `${errorCode}: ${message}`;
  }

  if (errorCode.length > 0) {
    return errorCode;
  }

  return message.length > 0 ? message : "authentication failed";
}

function normalizeErrorCode(body: SupabaseKeyProbeBody): string {
  const code = body.error_code ?? body.code;
  if (typeof code === "string") {
    return code;
  }

  if (typeof code === "number") {
    return String(code);
  }

  return "";
}

function getProbeMessage(body: SupabaseKeyProbeBody): string {
  return body.msg ?? body.message ?? "";
}
