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
