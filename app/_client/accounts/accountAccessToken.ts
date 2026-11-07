"use client";

let readAccessToken: () => string | null = () => null;

/** Registers the current account access token for server calls made outside React. */
export function registerAccountAccessTokenReader(
  reader: () => string | null,
): () => void {
  readAccessToken = reader;
  return () => {
    if (readAccessToken === reader) {
      readAccessToken = () => null;
    }
  };
}

export function currentAccountAccessToken(): string | null {
  return readAccessToken();
}
