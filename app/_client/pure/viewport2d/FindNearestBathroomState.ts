import { type NearestBathroomLocation } from "../../../_shared/find-nearest-bathroom/NearestBathroomLocation";

export type FindNearestBathroomRequestPhase =
  | "idle"
  | "pending"
  | "success"
  | "failure"
  | "timeout"
  | "not_found";

export type FindNearestBathroomRequestState = {
  phase: FindNearestBathroomRequestPhase;
};

export const INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE: FindNearestBathroomRequestState =
  {
    phase: "idle",
  };

export const FIND_NEAREST_BATHROOM_TIMEOUT_ALERT_MESSAGE =
  "Finding bathroom timed out";
export const FIND_NEAREST_BATHROOM_FAILURE_ALERT_MESSAGE =
  "An error occurred while finding nearest bathroom";
export const FIND_NEAREST_BATHROOM_NOT_FOUND_ALERT_MESSAGE =
  "No valid nearby bathrooms were found";

export type FindNearestBathroomTarget = NearestBathroomLocation;

export function findNearestBathroomRequestBegin(
  state: FindNearestBathroomRequestState,
): FindNearestBathroomRequestState {
  if (state.phase !== "idle") return state;
  return { phase: "pending" };
}

export function findNearestBathroomRequestResolveSuccess(
  state: FindNearestBathroomRequestState,
): FindNearestBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "success" };
}

export function findNearestBathroomRequestResolveFailure(
  state: FindNearestBathroomRequestState,
): FindNearestBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "failure" };
}

export function findNearestBathroomRequestResolveTimeout(
  state: FindNearestBathroomRequestState,
): FindNearestBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "timeout" };
}

export function findNearestBathroomRequestResolveNotFound(
  state: FindNearestBathroomRequestState,
): FindNearestBathroomRequestState {
  if (state.phase !== "pending") return state;
  return { phase: "not_found" };
}

export function findNearestBathroomRequestReset(): FindNearestBathroomRequestState {
  return INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE;
}

export function findNearestBathroomRequestApplyTerminalFailure(
  state: FindNearestBathroomRequestState,
  phase: Exclude<FindNearestBathroomRequestPhase, "idle" | "pending" | "success">,
): FindNearestBathroomRequestState {
  switch (phase) {
    case "timeout":
      return findNearestBathroomRequestResolveTimeout(state);
    case "not_found":
      return findNearestBathroomRequestResolveNotFound(state);
    default:
      return findNearestBathroomRequestResolveFailure(state);
  }
}

export function findNearestBathroomModeShouldRender(
  isPreviewActive: boolean,
): boolean {
  return isPreviewActive;
}

/** Spec: hide viewport chrome during Add bathroom mode and Confirm Find Bathroom mode only. */
export function viewport2dChromeHidden(args: {
  addBathroomModeActive: boolean;
  bathroomNavigationPreviewActive: boolean;
}): boolean {
  return args.addBathroomModeActive || args.bathroomNavigationPreviewActive;
}

export function findNearestBathroomRequestCanBegin(
  isPreviewActive: boolean,
  isActiveNavigation: boolean,
): boolean {
  return !isPreviewActive && !isActiveNavigation;
}

export function resolveFindNearestBathroomResult(
  result:
    | { errorMsg?: string; val: { id: number; latitude: number; longitude: number } | null }
    | "timeout"
    | "error",
): Exclude<FindNearestBathroomRequestPhase, "idle" | "pending"> {
  if (result === "timeout") return "timeout";
  if (result === "error") return "failure";
  if (result.errorMsg) return "failure";
  if (!result.val) return "not_found";
  return "success";
}

export function findNearestBathroomFailureAlertMessage(
  phase: Exclude<FindNearestBathroomRequestPhase, "idle" | "pending" | "success">,
): string {
  switch (phase) {
    case "timeout":
      return FIND_NEAREST_BATHROOM_TIMEOUT_ALERT_MESSAGE;
    case "not_found":
      return FIND_NEAREST_BATHROOM_NOT_FOUND_ALERT_MESSAGE;
    default:
      return FIND_NEAREST_BATHROOM_FAILURE_ALERT_MESSAGE;
  }
}
