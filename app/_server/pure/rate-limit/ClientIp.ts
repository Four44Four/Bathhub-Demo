import { isIP } from "node:net";

export type HeaderGetter = (name: string) => string | null;

const PROXY_IP_HEADER_NAMES = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-real-ip",
  "x-forwarded-for",
  "x-vercel-forwarded-for",
  "forwarded",
] as const;

function isValidIp(ip: string): boolean {
  return isIP(ip) !== 0;
}

/** Strips ports, quotes, and RFC 7239 `for=` prefixes from a single IP candidate. */
export function normalizeIpCandidate(raw: string): string | null {
  let trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.toLowerCase().startsWith("for=")) {
    trimmed = trimmed.slice(4).trim();
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  const bracketMatch = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch !== null) {
    return bracketMatch[1];
  }

  const ipv4WithPortMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPortMatch !== null) {
    return ipv4WithPortMatch[1];
  }

  return trimmed;
}

function parseXForwardedFor(value: string): string | null {
  const firstHop = value.split(",")[0]?.trim();
  if (firstHop === undefined || firstHop.length === 0) {
    return null;
  }
  const normalized = normalizeIpCandidate(firstHop);
  return normalized !== null && isValidIp(normalized) ? normalized : null;
}

function parseForwardedHeader(value: string): string | null {
  const firstEntry = value.split(",")[0]?.trim();
  if (firstEntry === undefined || firstEntry.length === 0) {
    return null;
  }

  const forPart = firstEntry
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("for="));
  if (forPart === undefined) {
    return null;
  }

  const normalized = normalizeIpCandidate(forPart);
  return normalized !== null && isValidIp(normalized) ? normalized : null;
}

function parseSimpleIpHeader(value: string): string | null {
  const normalized = normalizeIpCandidate(value);
  return normalized !== null && isValidIp(normalized) ? normalized : null;
}

function parseProxyHeader(
  headerName: (typeof PROXY_IP_HEADER_NAMES)[number],
  value: string,
): string | null {
  if (headerName === "x-forwarded-for" || headerName === "x-vercel-forwarded-for") {
    return parseXForwardedFor(value);
  }
  if (headerName === "forwarded") {
    return parseForwardedHeader(value);
  }
  return parseSimpleIpHeader(value);
}

/** Resolves the client IP from common reverse-proxy forwarding headers. */
export function getClientIpFromForwardedHeaders(
  getHeader: HeaderGetter,
  fallbackIp: string | null = null,
): string {
  for (const headerName of PROXY_IP_HEADER_NAMES) {
    const value = getHeader(headerName);
    if (value === null || value.length === 0) {
      continue;
    }

    const ip = parseProxyHeader(headerName, value);
    if (ip !== null) {
      return ip;
    }
  }

  if (fallbackIp !== null) {
    const normalizedFallback = normalizeIpCandidate(fallbackIp);
    if (normalizedFallback !== null && isValidIp(normalizedFallback)) {
      return normalizedFallback;
    }
  }

  return "unknown";
}
