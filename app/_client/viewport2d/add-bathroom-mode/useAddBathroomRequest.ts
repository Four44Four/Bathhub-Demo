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
    ): Promise<AddBathroomRequestPhase | null> => {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
      dispatch({ type: "begin" });

      const result = await withTimeout(
        createBathroomAt(latitude, longitude),
        ADD_BATHROOM_REQUEST_TIMEOUT_MS,
      );

      let terminalPhase: AddBathroomRequestPhase;
      if (result === "timeout") {
        terminalPhase = "timeout";
        dispatch({ type: "timeout" });
      } else if (result.errorMsg) {
        terminalPhase = "failure";
        dispatch({ type: "failure" });
      } else {
        terminalPhase = "success";
        dispatch({ type: "success" });
      }

      inFlightRef.current = false;
      return terminalPhase;
    },
    [],
  );

  return {
    requestState,
    resetRequest,
    submitCreate,
  };
}
