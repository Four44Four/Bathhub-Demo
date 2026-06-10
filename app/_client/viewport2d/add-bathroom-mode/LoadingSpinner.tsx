"use client";

import type { CSSProperties } from "react";

import { ADD_BATHROOM_LOADING_SPINNER_SIZE_PX } from "./Constants";

const SPINNER_BORDER_COLOR = "rgba(255, 255, 255, 0.22)";
const SPINNER_ACCENT_COLOR = "#ffffff";

export function LoadingSpinner() {
  const style: CSSProperties = {
    width: ADD_BATHROOM_LOADING_SPINNER_SIZE_PX,
    height: ADD_BATHROOM_LOADING_SPINNER_SIZE_PX,
    borderRadius: "50%",
    border: `3px solid ${SPINNER_BORDER_COLOR}`,
    borderTopColor: SPINNER_ACCENT_COLOR,
    animation: "add-bathroom-mode-spin 0.8s linear infinite",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{`
        @keyframes add-bathroom-mode-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div aria-hidden="true" style={style} />
    </>
  );
}
