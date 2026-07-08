"use client";

import type { CSSProperties } from "react";

import { AddBathroom as AddBathroomConsts } from "../../ComponentConstants";

const SPINNER_BORDER_COLOR = "rgba(255, 255, 255, 0.22)";
const SPINNER_ACCENT_COLOR = "#ffffff";

export function LoadingSpinner() {
  const style: CSSProperties = {
    width: AddBathroomConsts.LOADING_SPINNER_SIZE_PX,
    height: AddBathroomConsts.LOADING_SPINNER_SIZE_PX,
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
