import {
  bathroomPageFetchFailureAlertMessage,
  BATHROOM_PAGE_FETCH_ERROR_ALERT_MESSAGE,
  BATHROOM_PAGE_FETCH_TIMEOUT_ALERT_MESSAGE,
  promiseWithTimeout,
  resolveBathroomPageFetchResult,
  type PromiseWithTimeoutSchedule,
} from "../app/_client/pure/swipeup/BathroomPageFetchState";

describe("resolveBathroomPageFetchResult", () => {
  test("maps timeout to timeout phase", () => {
    expect(resolveBathroomPageFetchResult("timeout")).toBe("timeout");
  });

  test("maps rejection to error phase", () => {
    expect(resolveBathroomPageFetchResult("error")).toBe("error");
  });

  test("maps missing row to error phase", () => {
    expect(resolveBathroomPageFetchResult({ val: null, errorMsg: "missing" })).toBe(
      "error",
    );
  });

  test("maps successful row to loaded phase", () => {
    expect(
      resolveBathroomPageFetchResult({
        val: {
          id: 1,
          latitude: 0,
          longitude: 0,
          verify_status: "verified",
          temp_data: "",
          created_at: "2026-01-01T00:00:00Z",
          version: 1,
          rating_1_count: 0,
          rating_2_count: 0,
          rating_3_count: 0,
          rating_4_count: 0,
          rating_5_count: 0,
        },
      }),
    ).toBe("loaded");
  });
});

describe("bathroomPageFetchFailureAlertMessage", () => {
  test("returns timeout copy from spec", () => {
    expect(bathroomPageFetchFailureAlertMessage("timeout")).toBe(
      BATHROOM_PAGE_FETCH_TIMEOUT_ALERT_MESSAGE,
    );
    expect(BATHROOM_PAGE_FETCH_TIMEOUT_ALERT_MESSAGE).toBe(
      "Timed out looking up bathroom",
    );
  });

  test("returns error copy from spec", () => {
    expect(bathroomPageFetchFailureAlertMessage("error")).toBe(
      BATHROOM_PAGE_FETCH_ERROR_ALERT_MESSAGE,
    );
    expect(BATHROOM_PAGE_FETCH_ERROR_ALERT_MESSAGE).toBe(
      "Error occurred while looking up bathroom",
    );
  });
});

describe("promiseWithTimeout", () => {
  function createManualSchedule(): PromiseWithTimeoutSchedule & {
    runDueTimers: () => void;
  } {
    const timers = new Map<number, () => void>();
    let nextId = 1;

    return {
      setTimeout: (callback, timeoutMs) => {
        const id = nextId++;
        timers.set(id, callback);
        void timeoutMs;
        return id;
      },
      clearTimeout: (timerId) => {
        timers.delete(timerId);
      },
      runDueTimers: () => {
        for (const callback of timers.values()) {
          callback();
        }
        timers.clear();
      },
    };
  }

  test("resolves with the settled value before timeout", async () => {
    const result = await promiseWithTimeout(Promise.resolve("ok"), 1000);
    expect(result).toBe("ok");
  });

  test("resolves with timeout when the timer elapses first", async () => {
    const schedule = createManualSchedule();
    const resultPromise = promiseWithTimeout(
      new Promise<string>(() => {}),
      1000,
      schedule,
    );

    schedule.runDueTimers();
    await expect(resultPromise).resolves.toBe("timeout");
  });

  test("resolves with error when the promise rejects", async () => {
    const result = await promiseWithTimeout(Promise.reject(new Error("fail")), 1000);
    expect(result).toBe("error");
  });
});
