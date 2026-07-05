import { type EnvVarUsabilityIssueKind } from "./EnvVarUsability.ts";

const UNREACHABLE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

const AUTH_ERROR_CODES = new Set(["NOAUTH", "WRONGPASS"]);

export function isHttpAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function classifyEndpointFailure(
  error: unknown,
): { kind: EnvVarUsabilityIssueKind; detail: string } | null {
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "unreachable", detail: "timed out" };
  }

  const code = getErrorCode(error);
  if (code !== undefined && UNREACHABLE_ERROR_CODES.has(code)) {
    return { kind: "unreachable", detail: code.toLowerCase() };
  }

  if (code !== undefined && AUTH_ERROR_CODES.has(code)) {
    return { kind: "unauthenticated", detail: code.toLowerCase() };
  }

  const message = getErrorMessage(error).toLowerCase();
  if (message.length === 0) {
    return null;
  }

  if (
    message.includes("noauth") ||
    message.includes("wrongpass") ||
    message.includes("invalid api key") ||
    message.includes("invalid jwt") ||
    message.includes("invalid authentication") ||
    message.includes("unauthorized")
  ) {
    return { kind: "unauthenticated", detail: summarizeMessage(error) };
  }

  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("timed out")
  ) {
    return { kind: "unreachable", detail: summarizeMessage(error) };
  }

  return null;
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

function summarizeMessage(error: unknown): string {
  const message = getErrorMessage(error).trim();
  if (message.length === 0) {
    return "unknown error";
  }

  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
}
