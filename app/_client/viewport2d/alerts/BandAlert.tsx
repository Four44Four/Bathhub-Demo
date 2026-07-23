"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { Alerts as AlertConsts } from "../../ComponentConstants";
import { resolveBandAlertAutoHideDelayMs } from "../../pure/viewport2d/BandAlertPolicy";
import { TextWeight } from "../../Utils";

export type BandAlertLayout = "overlay" | "stack-item";

export type BandAlertProps = {
  message: string;
  positive?: boolean;
  /** Overrides the default positive/negative band background color. */
  backgroundColor?: string;
  /** When true, the band stays visible until the parent unmounts it or clears the message. */
  persistUntilRemoved?: boolean;
  onAutoHide?: () => void;
  layout?: BandAlertLayout;
};

export function BandAlert({
  message,
  positive = false,
  backgroundColor,
  persistUntilRemoved = false,
  onAutoHide,
  layout = "overlay",
}: BandAlertProps) {
  const onAutoHideRef = useRef(onAutoHide);
  onAutoHideRef.current = onAutoHide;

  useEffect(() => {
    const delayMs = resolveBandAlertAutoHideDelayMs(
      persistUntilRemoved,
      AlertConsts.BAND_ALERT_AUTO_HIDE_MS,
    );
    if (delayMs == null) {
      return;
    }

    const timerId = window.setTimeout(() => {
      onAutoHideRef.current?.();
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [message, persistUntilRemoved]);

  const resolvedBackgroundColor =
    backgroundColor ??
    (positive
      ? AlertConsts.POSITIVE_ACCENT_COLOR
      : AlertConsts.NEGATIVE_ACCENT_COLOR);

  const layoutStyle: CSSProperties =
    layout === "overlay"
      ? {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: AlertConsts.BAND_ALERT_Z_INDEX,
        }
      : {
          width: "100%",
        };

  const style: CSSProperties = {
    ...layoutStyle,
    backgroundColor: resolvedBackgroundColor,
    color: AlertConsts.TEXT_COLOR,
    fontSize: AlertConsts.BAND_ALERT_FONT_SIZE_PX,
    lineHeight: AlertConsts.BAND_ALERT_LINE_HEIGHT,
    textAlign: "center",
    padding: AlertConsts.BAND_ALERT_PADDING,
    boxSizing: "border-box",
    pointerEvents: "none",
  };

  return (
    <div role="alert" className={TextWeight.BOLD} style={style}>
      {message}
    </div>
  );
}
