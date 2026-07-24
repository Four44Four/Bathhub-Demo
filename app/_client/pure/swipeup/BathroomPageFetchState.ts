import { type BathroomDataPrimaryFullRow } from "../../../_shared/BathroomDataPrimary";
import { type Errorable } from "../../../_shared/Utils";

export const BATHROOM_PAGE_FETCH_TIMEOUT_ALERT_MESSAGE =
  "Timed out looking up bathroom";
export const BATHROOM_PAGE_FETCH_ERROR_ALERT_MESSAGE =
  "Error occurred while looking up bathroom";

export type BathroomPageFetchTerminalPhase = "loaded" | "timeout" | "error";

export type PromiseWithTimeoutSchedule = {
  setTimeout: (callback: () => void, timeoutMs: number) => number;
  clearTimeout: (timerId: number) => void;
};

const defaultSchedule: PromiseWithTimeoutSchedule = {
  setTimeout: (callback, timeoutMs) =>
    setTimeout(callback, timeoutMs) as unknown as number,
  clearTimeout: (timerId) => clearTimeout(timerId),
};

/** Resolves when `promise` settles, or with `"timeout"` / `"error"` on timeout or rejection. */
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  schedule: PromiseWithTimeoutSchedule = defaultSchedule,
): Promise<T | "timeout" | "error"> {
  return new Promise((resolve) => {
    const timer = schedule.setTimeout(() => resolve("timeout"), timeoutMs);

    promise
      .then((value) => {
        schedule.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        schedule.clearTimeout(timer);
        resolve("error");
      });
  });
}

export function resolveBathroomPageFetchResult(
  result: Errorable<BathroomDataPrimaryFullRow> | "timeout" | "error",
): BathroomPageFetchTerminalPhase {
  if (result === "timeout") return "timeout";
  if (result === "error") return "error";
  if (result.errorMsg || result.val == null) return "error";
  return "loaded";
}

export function bathroomPageFetchFailureAlertMessage(
  phase: Exclude<BathroomPageFetchTerminalPhase, "loaded">,
): string {
  return phase === "timeout"
    ? BATHROOM_PAGE_FETCH_TIMEOUT_ALERT_MESSAGE
    : BATHROOM_PAGE_FETCH_ERROR_ALERT_MESSAGE;
}
