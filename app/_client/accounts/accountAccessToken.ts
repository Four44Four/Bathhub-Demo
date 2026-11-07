"use client";

let readAccessToken: () => string | null = () => null;
let ensureFreshAccessToken: () => Promise<string | null> = async () =>
  readAccessToken();

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

/** Registers async access-token refresh used before authenticated mutations. */
export function registerAccountAccessTokenRefresher(
  refresher: () => Promise<string | null>,
): () => void {
  ensureFreshAccessToken = refresher;
  return () => {
    if (ensureFreshAccessToken === refresher) {
      ensureFreshAccessToken = async () => readAccessToken();
    }
  };
}

export function currentAccountAccessToken(): string | null {
  return readAccessToken();
}

/** Returns a non-expired access token, refreshing when needed. */
export async function currentAccountAccessTokenFresh(): Promise<string | null> {
  return ensureFreshAccessToken();
}
