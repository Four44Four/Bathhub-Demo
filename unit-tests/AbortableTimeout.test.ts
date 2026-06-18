import { runAbortableTimeout } from "../app/_client/pure/AbortableTimeout";

function createManualSchedule() {
  let callback: (() => void) | null = null;
  return {
    setTimeout: (cb: () => void, _timeoutMs: number) => {
      callback = cb;
      return 1;
    },
    clearTimeout: () => {
      callback = null;
    },
    elapse: () => {
      callback?.();
    },
  };
}

describe("runAbortableTimeout", () => {
  test("returns the resolved value when work finishes before the timeout", async () => {
    const result = await runAbortableTimeout(
      async () => ({ ok: true }),
      1000,
      createManualSchedule(),
    );

    expect(result).toEqual({ ok: true });
  });

  test("returns timeout and aborts the signal when the deadline elapses first", async () => {
    const schedule = createManualSchedule();
    let capturedSignal: AbortSignal | null = null;

    const resultPromise = runAbortableTimeout(
      (signal) => {
        capturedSignal = signal;
        return new Promise(() => {});
      },
      1000,
      schedule,
    );

    schedule.elapse();
    await expect(resultPromise).resolves.toBe("timeout");
    expect(capturedSignal?.aborted).toBe(true);
  });

  test("returns error when work rejects without aborting", async () => {
    const result = await runAbortableTimeout(
      async () => {
        throw new Error("network down");
      },
      1000,
      createManualSchedule(),
    );

    expect(result).toBe("error");
  });

  test("clears the timeout timer after work completes", async () => {
    const schedule = createManualSchedule();
    let cleared = false;
    const originalClearTimeout = schedule.clearTimeout;
    schedule.clearTimeout = (timerId) => {
      cleared = true;
      originalClearTimeout(timerId);
    };

    await runAbortableTimeout(async () => "done", 1000, schedule);

    expect(cleared).toBe(true);
  });
});
