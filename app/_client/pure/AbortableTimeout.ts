export type AbortableTimeoutOutcome<T> = T | "timeout" | "error";

export type AbortableTimeoutSchedule = {
  setTimeout: (callback: () => void, timeoutMs: number) => number;
  clearTimeout: (timerId: number) => void;
};

const defaultSchedule: AbortableTimeoutSchedule = {
  setTimeout: (callback, timeoutMs) =>
    setTimeout(callback, timeoutMs) as unknown as number,
  clearTimeout: (timerId) => clearTimeout(timerId),
};

/** Runs async work with a timeout that aborts the supplied signal when time elapses. */
export async function runAbortableTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  schedule: AbortableTimeoutSchedule = defaultSchedule,
): Promise<AbortableTimeoutOutcome<T>> {
  const controller = new AbortController();

  return new Promise<AbortableTimeoutOutcome<T>>((resolve) => {
    const timerId = schedule.setTimeout(() => {
      controller.abort();
      resolve("timeout");
    }, timeoutMs);

    run(controller.signal)
      .then((value) => {
        schedule.clearTimeout(timerId);
        if (controller.signal.aborted) {
          resolve("timeout");
          return;
        }
        resolve(value);
      })
      .catch(() => {
        schedule.clearTimeout(timerId);
        resolve(controller.signal.aborted ? "timeout" : "error");
      });
  });
}
