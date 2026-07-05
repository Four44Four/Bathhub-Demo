import { appendBandAlertWithMaxStack } from "./BandAlertPolicy";
import { PositionalAlertSide } from "../../viewport2d/AlertSystem";

export type PositionalAlertRecord = {
  id: string;
  message: string;
  side: PositionalAlertSide;
};

export type ImportantAlertButtonStyle = "accent" | "background";

export type ImportantAlertButton = {
  label: string;
  style: ImportantAlertButtonStyle;
  onClick?: () => void;
};

export type ImportantAlertRecord = {
  message: string;
  positive: boolean;
  buttons: ImportantAlertButton[];
};

export type BandAlertRecord = {
  id: string;
  message: string;
  positive: boolean;
  persistUntilRemoved: boolean;
  createdAtMs: number;
};

export type AlertSystemState = {
  positional: PositionalAlertRecord[];
  important: ImportantAlertRecord | null;
  band: BandAlertRecord[];
};

export const EMPTY_ALERT_SYSTEM_STATE: AlertSystemState = {
  positional: [],
  important: null,
  band: [],
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

export function resolveImportantAlertButtons(options: {
  okLabel?: string;
  onDismiss?: () => void;
  buttons?: ImportantAlertButton[];
}): ImportantAlertButton[] {
  if (options.buttons != null && options.buttons.length > 0) {
    return options.buttons;
  }
  return [
    {
      label: options.okLabel ?? "Ok",
      style: "accent",
      onClick: options.onDismiss,
    },
  ];
}

export function alertSystemShowImportant(
  state: AlertSystemState,
  message: string,
  positive: boolean,
  buttons: ImportantAlertButton[],
): AlertSystemState {
  return {
    ...state,
    important: { message, positive, buttons },
  };
}

export function alertSystemDismissImportant(
  state: AlertSystemState,
): AlertSystemState {
  return { ...state, important: null };
}

export function alertSystemShowBand(
  state: AlertSystemState,
  id: string,
  message: string,
  options: {
    positive?: boolean;
    persistUntilRemoved?: boolean;
    createdAtMs?: number;
    maxStack: number;
  },
): AlertSystemState {
  const record: BandAlertRecord = {
    id,
    message,
    positive: options.positive ?? false,
    persistUntilRemoved: options.persistUntilRemoved ?? false,
    createdAtMs: options.createdAtMs ?? 0,
  };
  return {
    ...state,
    band: appendBandAlertWithMaxStack(state.band, record, options.maxStack),
  };
}

export function alertSystemDismissBand(
  state: AlertSystemState,
  id: string,
): AlertSystemState {
  return {
    ...state,
    band: state.band.filter((entry) => entry.id !== id),
  };
}
