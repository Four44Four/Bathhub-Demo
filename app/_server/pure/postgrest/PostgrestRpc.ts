export function parsePostgrestRpcErrorMessage(
  body: unknown,
  statusText: string,
): string {
  if (typeof body === "string" && body.length > 0) {
    return body;
  }
  if (typeof body === "object" && body !== null) {
    const record = body as {
      message?: unknown;
      error?: unknown;
      msg?: unknown;
    };
    if (typeof record.message === "string" && record.message.length > 0) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.length > 0) {
      return record.error;
    }
    if (typeof record.msg === "string" && record.msg.length > 0) {
      return record.msg;
    }
  }
  return statusText.length > 0 ? statusText : "request failed";
}

/** First row of a PostgREST RPC payload, or the object itself when it is not an array. */
export function parsePostgrestRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }
  if (data === null || data === undefined) {
    return null;
  }
  return data as T;
}
