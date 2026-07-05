"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { SchemaLoadingScreen } from "../ComponentConstants";
import { TextWeight } from "../Utils";
import {
  USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX,
  USER_SETTINGS_PAGE_BG,
} from "./UserSettingsConstants";

const SPINNER_SIZE_PX = 40;
const SPINNER_BORDER_COLOR = "rgba(14, 15, 17, 0.22)";
const SPINNER_ACCENT_COLOR = "#0E0F11";

export type UserSettingsSchemaOutOfDateScreenProps = {
  exiting: boolean;
  onExitComplete: () => void;
};

function SchemaLoadingSpinner() {
  const style: CSSProperties = {
    width: SPINNER_SIZE_PX,
    height: SPINNER_SIZE_PX,
    borderRadius: "50%",
    border: `3px solid ${SPINNER_BORDER_COLOR}`,
    borderTopColor: SPINNER_ACCENT_COLOR,
    animation: "schema-loading-screen-spin 0.8s linear infinite",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{`
        @keyframes schema-loading-screen-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div aria-hidden="true" style={style} />
    </>
  );
}

export function UserSettingsSchemaOutOfDateScreen({
  exiting,
  onExitComplete,
}: UserSettingsSchemaOutOfDateScreenProps) {
  const [slideOut, setSlideOut] = useState(false);

  useEffect(() => {
    if (!exiting) {
      setSlideOut(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setSlideOut(true);
    });
    const timer = setTimeout(
      onExitComplete,
      SchemaLoadingScreen.ANIMATE_OUT_MS,
    );

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [exiting, onExitComplete]);

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100000,
        backgroundColor: USER_SETTINGS_PAGE_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX,
        boxSizing: "border-box",
        transform: slideOut ? "translateY(100%)" : "translateY(0)",
        transition: `transform ${SchemaLoadingScreen.ANIMATE_OUT_MS}ms ease-in`,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <p
          className={TextWeight.BOLD}
          style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.4,
            textAlign: "center",
            color: "#0E0F11",
          }}
        >
          Loading updated settings
        </p>
        <SchemaLoadingSpinner />
      </div>
    </div>
  );
}
