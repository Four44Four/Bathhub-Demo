"use client";

import { useCallback, useEffect, type CSSProperties, type RefObject } from "react";

import type { GlobeViewportHandle } from "../../globe/GlobeViewport";
import { useAnimatedOpacity } from "../../useAnimatedOpacity";
import {
  addBathroomModeBackdropBlocksPointerEvents,
  addBathroomModeShouldRender,
  addBathroomModeShowSpinner,
  addBathroomResultAlertForPhase,
} from "../../pure/viewport2d/AddBathroomModeState";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../../pure/viewport2d/PositionalAlertAnchor";
import { useReportRateLimitViolation } from "../../pure/rate-limit/useReportRateLimitViolation";
import { useAlertSystem } from "../AlertSystem";
import { ActionButtons } from "./ActionButtons";
import { useAddBathroomMode } from "./Context";
import { Backdrop } from "./Backdrop";
import { Marker } from "./Marker";
import { useAddBathroomRequest } from "./useAddBathroomRequest";
import { refreshBathroomsInGlobeViewport } from "../../Bathroom";

export type AddBathroomModeProps = {
  globeRef: RefObject<GlobeViewportHandle | null>;
};

export function AddBathroomMode({ globeRef }: AddBathroomModeProps) {
  const { isActive, exitAddBathroomMode } = useAddBathroomMode();
  const { showImportantAlert } = useAlertSystem();
  const reportRateLimitViolation = useReportRateLimitViolation();
  const { requestState, resetRequest, submitCreate } = useAddBathroomRequest();
  const {
    opacity: backdropOpacity,
    animateTo: animateBackdropOpacityTo,
    setImmediate: setBackdropOpacityImmediate,
  } = useAnimatedOpacity();
  const {
    opacity: spinnerOpacity,
    animateTo: animateSpinnerOpacityTo,
    setImmediate: setSpinnerOpacityImmediate,
  } = useAnimatedOpacity();

  useEffect(() => {
    if (isActive) {
      resetRequest();
      return;
    }
    if (backdropOpacity <= 0) {
      setSpinnerOpacityImmediate(0);
      setBackdropOpacityImmediate(0);
      resetRequest();
    }
  }, [
    backdropOpacity,
    isActive,
    resetRequest,
    setBackdropOpacityImmediate,
    setSpinnerOpacityImmediate,
  ]);

  useEffect(() => {
    if (addBathroomModeShowSpinner(requestState.phase)) {
      animateSpinnerOpacityTo(1);
      return;
    }
    if (requestState.phase !== "idle") {
      animateSpinnerOpacityTo(0);
    }
  }, [animateSpinnerOpacityTo, requestState.phase]);

  const showResultAlert = useCallback(
    (
      phase: "success" | "failure" | "timeout",
      errorMsg?: string,
    ) => {
      if (phase === "failure" && reportRateLimitViolation(errorMsg)) {
        animateBackdropOpacityTo(0);
        exitAddBathroomMode({ withNewBathroom: false });
        resetRequest();
        return;
      }

      const alertConfig = addBathroomResultAlertForPhase(phase);
      if (!alertConfig) return;

      showImportantAlert({
        message: alertConfig.message,
        positive: alertConfig.positive,
        onDismiss: () => {
          animateBackdropOpacityTo(0);
          if (alertConfig.exitWithNewBathroom) {
            void refreshBathroomsInGlobeViewport(globeRef);
          }
          exitAddBathroomMode({
            withNewBathroom: alertConfig.exitWithNewBathroom,
          });
          resetRequest();
        },
      });
    },
    [
      animateBackdropOpacityTo,
      exitAddBathroomMode,
      globeRef,
      resetRequest,
      reportRateLimitViolation,
      showImportantAlert,
    ],
  );

  const handleCancel = useCallback(() => {
    exitAddBathroomMode({ withNewBathroom: false });
  }, [exitAddBathroomMode]);

  const handleConfirm = useCallback(async () => {
    const center = globeRef.current?.getViewportCenterLatLon();
    if (!center) return;

    const { phase: terminalPhase, errorMsg } = await submitCreate(
      center.latitude,
      center.longitude,
      () => animateBackdropOpacityTo(1),
    );
    if (
      terminalPhase === "success" ||
      terminalPhase === "failure" ||
      terminalPhase === "timeout"
    ) {
      showResultAlert(terminalPhase, errorMsg);
    }
  }, [
    animateBackdropOpacityTo,
    globeRef,
    showResultAlert,
    submitCreate,
  ]);

  if (
    !addBathroomModeShouldRender(isActive, backdropOpacity, spinnerOpacity)
  ) {
    return null;
  }

  const shellStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: VIEWPORT2D_TOP_LAYER_Z_INDEX,
    pointerEvents: "none",
  };

  const requestPending = requestState.phase === "pending";

  return (
    <>
      <Backdrop
        opacity={backdropOpacity}
        spinnerOpacity={spinnerOpacity}
        blocksPointerEvents={addBathroomModeBackdropBlocksPointerEvents(
          requestState.phase,
        )}
      />
      {isActive ? (
        <div style={shellStyle}>
          <Marker />
          <ActionButtons
            disabled={requestPending}
            onCancel={handleCancel}
            onConfirm={() => {
              void handleConfirm();
            }}
          />
        </div>
      ) : null}
    </>
  );
}
