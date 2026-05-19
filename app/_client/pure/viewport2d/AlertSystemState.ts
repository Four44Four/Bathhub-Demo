import { PositionalAlertSide } from "../../viewport2d/AlertSystem";

export type PositionalAlertRecord = {
  id: string;
  message: string;
  side: PositionalAlertSide;
};

export type ImportantAlertRecord = {
  message: string;
  okLabel: string;
};

export type AlertSystemState = {
  positional: PositionalAlertRecord[];
  important: ImportantAlertRecord | null;
};

export const EMPTY_ALERT_SYSTEM_STATE: AlertSystemState = {
  positional: [],
  important: null,
};

export function alertSystemShowPositional(
  state: AlertSystemState,
  id: string,
  message: string,
  side: PositionalAlertSide,
): AlertSystemState {
  return {
    ...state,
    positional: [...state.positional, { id, message, side }],
  };
}

export function alertSystemDismissPositional(
  state: AlertSystemState,
  id: string,
): AlertSystemState {
  return {
    ...state,
    positional: state.positional.filter((entry) => entry.id !== id),
  };
}

export function alertSystemDismissAllPositional(
  state: AlertSystemState,
): AlertSystemState {
  return { ...state, positional: [] };
}

export function alertSystemShowImportant(
  state: AlertSystemState,
  message: string,
  okLabel: string,
): AlertSystemState {
  return {
    ...state,
    important: { message, okLabel },
  };
}

export function alertSystemDismissImportant(
  state: AlertSystemState,
): AlertSystemState {
  return { ...state, important: null };
}
