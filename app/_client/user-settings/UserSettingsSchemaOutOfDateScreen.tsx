"use client";

import { useEffect, useState } from "react";

import { SchemaLoadingScreen, UserSettings as UserSettingsConsts } from "../ComponentConstants";
import { TextWeight } from "../Utils";
import { LoadingSpinner } from "../viewport2d/LoadingSpinner";

export type UserSettingsSchemaOutOfDateScreenProps = {
  exiting: boolean;
  onExitComplete: () => void;
};

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
        backgroundColor: UserSettingsConsts.PAGE_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: UserSettingsConsts.HEADER_HORIZONTAL_PADDING_PX,
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
        <LoadingSpinner
          accentColor={UserSettingsConsts.SCHEMA_LOADING_SPINNER_ACCENT_COLOR}
          baseColor={UserSettingsConsts.SCHEMA_LOADING_SPINNER_BASE_COLOR}
          radiusPx={UserSettingsConsts.SCHEMA_LOADING_SPINNER_RADIUS_PX}
        />
      </div>
    </div>
  );
}
