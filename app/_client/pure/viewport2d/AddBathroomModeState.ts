export type SwipeMenuRestoreTarget = "collapsed" | "expanded";

export type AddBathroomRequestPhase =
  | "idle"
  | "pending"
  | "success"
  | "failure"
  | "timeout";

export type AddBathroomRequestState = {
  phase: AddBathroomRequestPhase;
};

export const INITIAL_ADD_BATHROOM_REQUEST_STATE: AddBathroomRequestState = {
  phase: "idle",
};

export type AddBathroomResultAlert = {
  message: string;
  positive: boolean;
  exitWithNewBathroom: boolean;
};

export const ADD_BATHROOM_SUCCESS_ALERT_MESSAGE = "Bathroom added !!";
export const ADD_BATHROOM_FAILURE_ALERT_MESSAGE =
  "Something when wrong while adding Bathroom";
export const ADD_BATHROOM_TIMEOUT_ALERT_MESSAGE =
  "Timed out while adding Bathroom";

/** Maps exit flag to the swipe menu height the spec requires on leave. */
export function addBathroomModeSwipeMenuRestoreTarget(
  withNewBathroom: boolean,
): SwipeMenuRestoreTarget {
  return withNewBathroom ? "collapsed" : "expanded";
}

/** Keep overlay mounted while active or while backdrop/spinner opacity is still animating out. */
export function addBathroomModeShouldRender(
  isActive: boolean,
  backdropOpacity: number,
  spinnerOpacity: number,
): boolean {
  return isActive || backdropOpacity > 0 || spinnerOpacity > 0;
}

export function addBathroomRequestBegin(
  state: AddBathroomRequestState,
): AddBathroomRequestState {
  if (state.phase !== "idle") return state;
  return { phase: "pending" };
}

export function addBathroomRequestResolveSuccess(
  state: AddBathroomRequestState,
): AddBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "success" };
}

export function addBathroomRequestResolveFailure(
  state: AddBathroomRequestState,
): AddBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "failure" };
}

export function addBathroomRequestResolveTimeout(
  state: AddBathroomRequestState,
): AddBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "timeout" };
}

export function addBathroomRequestReset(
  _state: AddBathroomRequestState,
): AddBathroomRequestState {
  return INITIAL_ADD_BATHROOM_REQUEST_STATE;
}

export function addBathroomResultAlertForPhase(
  phase: AddBathroomRequestPhase,
): AddBathroomResultAlert | null {
  switch (phase) {
    case "success":
      return {
        message: ADD_BATHROOM_SUCCESS_ALERT_MESSAGE,
        positive: true,
        exitWithNewBathroom: true,
      };
    case "failure":
      return {
        message: ADD_BATHROOM_FAILURE_ALERT_MESSAGE,
        positive: false,
        exitWithNewBathroom: false,
      };
    case "timeout":
      return {
        message: ADD_BATHROOM_TIMEOUT_ALERT_MESSAGE,
        positive: false,
        exitWithNewBathroom: false,
      };
    default:
      return null;
  }
}

export function addBathroomModeShowSpinner(
  requestPhase: AddBathroomRequestPhase,
): boolean {
  return requestPhase === "pending";
}
