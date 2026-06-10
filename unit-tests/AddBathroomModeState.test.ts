import {
  addBathroomModeShouldRender,
  addBathroomModeShowSpinner,
  addBathroomModeBackdropBlocksPointerEvents,
  addBathroomModeSwipeMenuRestoreTarget,
  addBathroomRequestBegin,
  addBathroomRequestReset,
  addBathroomRequestResolveFailure,
  addBathroomRequestResolveSuccess,
  addBathroomRequestResolveTimeout,
  addBathroomResultAlertForPhase,
  INITIAL_ADD_BATHROOM_REQUEST_STATE,
  resolveAddBathroomCreateResult,
} from "../app/_client/pure/viewport2d/AddBathroomModeState";

describe("AddBathroomModeState", () => {
  test("swipe menu restore target from exit flag", () => {
    expect(addBathroomModeSwipeMenuRestoreTarget(true)).toBe("collapsed");
    expect(addBathroomModeSwipeMenuRestoreTarget(false)).toBe("expanded");
  });

  test("render gate stays mounted until overlays finish", () => {
    expect(addBathroomModeShouldRender(false, 0, 0)).toBe(false);
    expect(addBathroomModeShouldRender(true, 0, 0)).toBe(true);
    expect(addBathroomModeShouldRender(false, 0.2, 0)).toBe(true);
    expect(addBathroomModeShouldRender(false, 0, 0.4)).toBe(true);
  });

  test("request lifecycle transitions", () => {
    let state = INITIAL_ADD_BATHROOM_REQUEST_STATE;
    state = addBathroomRequestBegin(state);
    expect(state.phase).toBe("pending");
    expect(addBathroomModeShowSpinner(state.phase)).toBe(true);

    state = addBathroomRequestResolveSuccess(state);
    expect(state.phase).toBe("success");
    expect(addBathroomModeShowSpinner(state.phase)).toBe(false);

    state = addBathroomRequestReset(state);
    expect(state).toEqual(INITIAL_ADD_BATHROOM_REQUEST_STATE);
  });

  test("request resolves only from pending", () => {
    expect(addBathroomRequestResolveSuccess(INITIAL_ADD_BATHROOM_REQUEST_STATE)).toEqual(
      INITIAL_ADD_BATHROOM_REQUEST_STATE,
    );
    let pending = addBathroomRequestBegin(INITIAL_ADD_BATHROOM_REQUEST_STATE);
    pending = addBathroomRequestResolveFailure(pending);
    expect(pending.phase).toBe("failure");
    pending = addBathroomRequestReset(pending);
    pending = addBathroomRequestBegin(pending);
    pending = addBathroomRequestResolveTimeout(pending);
    expect(pending.phase).toBe("timeout");
  });

  test("result alerts for terminal request phases", () => {
    expect(addBathroomResultAlertForPhase("idle")).toBeNull();
    expect(addBathroomResultAlertForPhase("pending")).toBeNull();
    expect(addBathroomResultAlertForPhase("success")).toEqual({
      message: "Bathroom added !!",
      positive: true,
      exitWithNewBathroom: true,
    });
    expect(addBathroomResultAlertForPhase("failure")).toEqual({
      message: "Something when wrong while adding Bathroom",
      positive: false,
      exitWithNewBathroom: false,
    });
    expect(addBathroomResultAlertForPhase("timeout")).toEqual({
      message: "Timed out while adding Bathroom",
      positive: false,
      exitWithNewBathroom: false,
    });
  });

  test("create result resolves to terminal request phase", () => {
    expect(resolveAddBathroomCreateResult("timeout")).toBe("timeout");
    expect(resolveAddBathroomCreateResult({ errorMsg: "db down" })).toBe(
      "failure",
    );
    expect(resolveAddBathroomCreateResult({ val: { id: 1 } } as never)).toBe(
      "success",
    );
  });

  test("backdrop blocks pointer events only while pending", () => {
    expect(addBathroomModeBackdropBlocksPointerEvents("idle")).toBe(false);
    expect(addBathroomModeBackdropBlocksPointerEvents("pending")).toBe(true);
    expect(addBathroomModeBackdropBlocksPointerEvents("success")).toBe(false);
    expect(addBathroomModeBackdropBlocksPointerEvents("failure")).toBe(false);
    expect(addBathroomModeBackdropBlocksPointerEvents("timeout")).toBe(false);
  });
});
