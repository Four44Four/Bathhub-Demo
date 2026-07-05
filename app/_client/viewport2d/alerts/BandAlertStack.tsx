"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";

import { Alerts as AlertConsts } from "../../ComponentConstants";
import { orderBandAlertsNewestFirst } from "../../pure/viewport2d/BandAlertPolicy";

import { BandAlert } from "./BandAlert";

export type BandAlertStackEntry = {
  id: string;
  message: string;
  positive?: boolean;
  persistUntilRemoved?: boolean;
  createdAtMs: number;
};

export type BandAlertStackProps = {
  alerts: readonly BandAlertStackEntry[];
  onDismiss?: (id: string) => void;
};

export function BandAlertStack({ alerts, onDismiss }: BandAlertStackProps) {
  const orderedAlerts = useMemo(
    () => orderBandAlertsNewestFirst(alerts),
    [alerts],
  );

  if (orderedAlerts.length === 0) {
    return null;
  }

  const containerStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: AlertConsts.BAND_ALERT_Z_INDEX,
    display: "flex",
    flexDirection: "column",
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle}>
      {orderedAlerts.map((alert) => (
        <BandAlert
          key={alert.id}
          message={alert.message}
          positive={alert.positive}
          persistUntilRemoved={alert.persistUntilRemoved}
          layout="stack-item"
          onAutoHide={
            alert.persistUntilRemoved ? undefined : () => onDismiss?.(alert.id)
          }
        />
      ))}
    </div>
  );
}
