"use client";

import {
  createContext,
  createElement,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  positionalAlertIdsWithDetachedAnchors,
  subscribePositionalAlertClipRect,
} from "../pure/viewport2d/PositionalAlertAnchor";
import { subscribeOnTap } from "./NonDragTapDetector";

import {
  alertSystemDismissAllPositional,
  alertSystemDismissImportant,
  alertSystemDismissPositional,
  alertSystemShowImportant,
  alertSystemShowPositional,
  EMPTY_ALERT_SYSTEM_STATE,
  type AlertSystemState,
  type ImportantAlertRecord,
  type PositionalAlertRecord,
} from "../pure/viewport2d/AlertSystemState";
import { ImportantAlert } from "./alerts/ImportantAlert";
import { PositionalAlert } from "./alerts/PositionalAlert";
import { type Rect } from "../Utils";

export type PositionalAlertSide = "up" | "down";

export type ShowPositionalAlertOptions = {
  anchorElement: HTMLElement;
  message: string;
  side: PositionalAlertSide;
};

export type ShowImportantAlertOptions = {
  message: string;
  okLabel?: string;
};

export type AlertSystemApi = {
  showPositionalAlert: (options: ShowPositionalAlertOptions) => string;
  dismissPositionalAlert: (id: string) => void;
  dismissAllPositionalAlerts: () => void;
  showImportantAlert: (options: ShowImportantAlertOptions) => void;
  dismissImportantAlert: () => void;
};

type PositionalAlertRuntime = PositionalAlertRecord & {
  anchorElement: HTMLElement;
};

type AlertSystemContextValue = AlertSystemApi & {
  state: AlertSystemState;
};

const AlertSystemContext = createContext<AlertSystemContextValue | null>(null);

let nextAlertId = 0;

function createAlertId(): string {
  nextAlertId += 1;
  return `alert-${nextAlertId}`;
}

/** @internal Reset id sequence for tests. */
export function resetAlertSystemIdSequenceForTests(): void {
  nextAlertId = 0;
}

function AlertSystemOverlay({
  positional,
  important,
  clipRect,
  onDismissPositional,
  onDismissImportant,
}: {
  positional: PositionalAlertRuntime[];
  important: ImportantAlertRecord | null;
  clipRect: Rect | null;
  onDismissPositional: (id: string) => void;
  onDismissImportant: () => void;
}) {
  return createElement(
    Fragment,
    null,
    positional.map((entry) =>
      createElement(PositionalAlert, {
        key: entry.id,
        anchorElement: entry.anchorElement,
        message: entry.message,
        side: entry.side,
        clipRect,
        onDismiss: () => onDismissPositional(entry.id),
      }),
    ),
    important
      ? createElement(ImportantAlert, {
          key: "important",
          message: important.message,
          okLabel: important.okLabel,
          onDismiss: onDismissImportant,
        })
      : null,
  );
}

export type AlertSystemProviderProps = {
  children: ReactNode;
  /** Virtual phone frame; positional alerts are placed and clipped to this element. */
  phoneViewportRef: RefObject<HTMLElement | null>;
};

export function AlertSystemProvider({
  children,
  phoneViewportRef,
}: AlertSystemProviderProps) {
  const [state, setState] = useState<AlertSystemState>(EMPTY_ALERT_SYSTEM_STATE);
  const [clipRect, setClipRect] = useState<Rect | null>(null);
  const anchorsRef = useRef<Map<string, HTMLElement>>(new Map());

  useLayoutEffect(() => {
    const clipElement = phoneViewportRef.current;
    if (clipElement == null) {
      setClipRect(null);
      return;
    }
    return subscribePositionalAlertClipRect(clipElement, setClipRect);
  }, [phoneViewportRef]);

  const showPositionalAlert = useCallback(
    ({ anchorElement, message, side }: ShowPositionalAlertOptions): string => {
      const id = createAlertId();
      anchorsRef.current.set(id, anchorElement);
      setState((prev) => alertSystemShowPositional(prev, id, message, side));
      return id;
    },
    [],
  );

  const dismissPositionalAlert = useCallback((id: string) => {
    anchorsRef.current.delete(id);
    setState((prev) => alertSystemDismissPositional(prev, id));
  }, []);

  const dismissAllPositionalAlerts = useCallback(() => {
    anchorsRef.current.clear();
    setState((prev) => alertSystemDismissAllPositional(prev));
  }, []);

  const dismissAllPositionalAlertsRef = useRef(dismissAllPositionalAlerts);
  dismissAllPositionalAlertsRef.current = dismissAllPositionalAlerts;

  useEffect(() => {
    if (state.positional.length === 0) return;
    return subscribeOnTap(() => {
      dismissAllPositionalAlertsRef.current();
    });
  }, [state.positional.length]);

  const dismissPositionalAlertRef = useRef(dismissPositionalAlert);
  dismissPositionalAlertRef.current = dismissPositionalAlert;

  useEffect(() => {
    if (state.positional.length === 0) return;
    const detachedIds = positionalAlertIdsWithDetachedAnchors(
      state.positional,
      (id) => anchorsRef.current.get(id),
    );
    for (const id of detachedIds) {
      dismissPositionalAlertRef.current(id);
    }
  }, [state.positional]);

  const showImportantAlert = useCallback(
    ({ message, okLabel = "Ok" }: ShowImportantAlertOptions) => {
      setState((prev) => alertSystemShowImportant(prev, message, okLabel));
    },
    [],
  );

  const dismissImportantAlert = useCallback(() => {
    setState((prev) => alertSystemDismissImportant(prev));
  }, []);

  const positionalRuntime = useMemo((): PositionalAlertRuntime[] => {
    return state.positional.flatMap((record) => {
      const anchorElement = anchorsRef.current.get(record.id);
      if (anchorElement == null) return [];
      return [{ ...record, anchorElement }];
    });
  }, [state.positional]);

  const api = useMemo<AlertSystemApi>(
    () => ({
      showPositionalAlert,
      dismissPositionalAlert,
      dismissAllPositionalAlerts,
      showImportantAlert,
      dismissImportantAlert,
    }),
    [
      dismissAllPositionalAlerts,
      dismissImportantAlert,
      dismissPositionalAlert,
      showImportantAlert,
      showPositionalAlert,
    ],
  );

  const contextValue = useMemo<AlertSystemContextValue>(
    () => ({ ...api, state }),
    [api, state],
  );

  return createElement(
    AlertSystemContext.Provider,
    { value: contextValue },
    children,
    createElement(AlertSystemOverlay, {
      positional: positionalRuntime,
      important: state.important,
      clipRect,
      onDismissPositional: dismissPositionalAlert,
      onDismissImportant: dismissImportantAlert,
    }),
  );
}

export function useAlertSystem(): AlertSystemApi {
  const ctx = useContext(AlertSystemContext);
  if (ctx == null) {
    throw new Error("useAlertSystem must be used within AlertSystemProvider");
  }
  return ctx;
}
