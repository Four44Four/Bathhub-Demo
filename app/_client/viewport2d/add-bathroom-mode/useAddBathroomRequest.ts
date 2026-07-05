"use client";

import { useCallback, useReducer, useRef } from "react";

import { createBathroomAt } from "../../Bathroom";
import {
  addBathroomRequestBegin,
  addBathroomRequestReset,
  addBathroomRequestResolveFailure,
  addBathroomRequestResolveSuccess,
  addBathroomRequestResolveTimeout,
  INITIAL_ADD_BATHROOM_REQUEST_STATE,
  resolveAddBathroomCreateResult,
  type AddBathroomRequestPhase,
  type AddBathroomRequestState,
} from "../../pure/viewport2d/AddBathroomModeState";
import { ADD_BATHROOM_REQUEST_TIMEOUT_MS } from "./Constants";

type RequestAction =
  | { type: "begin" }
  | { type: "success" }
  | { type: "failure" }
  | { type: "timeout" }
  | { type: "reset" };

function requestReducer(
  state: AddBathroomRequestState,
  action: RequestAction,
): AddBathroomRequestState {
  switch (action.type) {
    case "begin":
      return addBathroomRequestBegin(state);
    case "success":
      return addBathroomRequestResolveSuccess(state);
    case "failure":
      return addBathroomRequestResolveFailure(state);
    case "timeout":
      return addBathroomRequestResolveTimeout(state);
    case "reset":
      return addBathroomRequestReset(state);
    default:
      return state;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | "timeout"> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve("timeout"), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve("timeout");
      });
  });
}

function dispatchTerminalPhase(
  dispatch: (action: RequestAction) => void,
  phase: Exclude<AddBathroomRequestPhase, "idle" | "pending">,
): void {
  switch (phase) {
    case "success":
      dispatch({ type: "success" });
      break;
    case "failure":
      dispatch({ type: "failure" });
      break;
    case "timeout":
      dispatch({ type: "timeout" });
      break;
  }
}

export function useAddBathroomRequest() {
  const [requestState, dispatch] = useReducer(
    requestReducer,
    INITIAL_ADD_BATHROOM_REQUEST_STATE,
  );
  const inFlightRef = useRef(false);

  const resetRequest = useCallback(() => {
    inFlightRef.current = false;
    dispatch({ type: "reset" });
  }, []);

  const submitCreate = useCallback(
    async (
      latitude: number,
      longitude: number,
      showLoadingScreen: () => void,
    ): Promise<{
      phase: AddBathroomRequestPhase | null;
      errorMsg?: string;
    }> => {
      if (inFlightRef.current) return { phase: null };
      inFlightRef.current = true;

      const requestPromise = withTimeout(
        createBathroomAt(latitude, longitude),
        ADD_BATHROOM_REQUEST_TIMEOUT_MS,
      );

      showLoadingScreen();
      dispatch({ type: "begin" });

      const result = await requestPromise;
      const terminalPhase = resolveAddBathroomCreateResult(result);
      dispatchTerminalPhase(dispatch, terminalPhase);

      inFlightRef.current = false;
      return {
        phase: terminalPhase,
        errorMsg:
          result !== "timeout" && typeof result === "object"
            ? result.errorMsg
            : undefined,
      };
    },
    [],
  );

  return {
    requestState,
    resetRequest,
    submitCreate,
  };
}
