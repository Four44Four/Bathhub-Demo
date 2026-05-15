import { useEffect, useMemo, useState } from "react";

import {
  zoomIndicatorOpacityTransitionCss,
  zoomIndicatorSquareTopLeftCss,
} from "../pure/ZoomIndicator";

export const ZOOM_INDICATOR_COLOR = "#000";
export const ZOOM_INDICATOR_FADE_IN_MS = 150;
export const ZOOM_INDICATOR_FADE_OUT_MS = 500;
export const ZOOM_INDICATOR_SIZE = 18;

export type ZoomIndicatorProps = {
  /** X in CSS pixels, relative to the nearest positioned ancestor. */
  x: number;
  /** Y in CSS pixels, relative to the nearest positioned ancestor. */
  y: number;
  /**
   * Increment this value to restart the fade animation at the current position.
   * (e.g. pass a zoom event counter or timestamp).
   */
  pulse: number;
  /** Hide the indicator entirely. */
  hidden?: boolean;
};

export function ZoomIndicator({ x, y, pulse, hidden }: ZoomIndicatorProps) {
  const [opacity, setOpacity] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("out");

  useEffect(() => {
    if (hidden) return;
    // Restart animation:
    // - jump to 0 immediately
    // - fade in quickly
    // - then fade out
    setPhase("in");
    setOpacity(0);

    let raf: number | null = null;
    let t: number | null = null;

    raf = requestAnimationFrame(() => {
      setOpacity(1);
      t = window.setTimeout(() => {
        setPhase("out");
        setOpacity(0);
      }, ZOOM_INDICATOR_FADE_IN_MS);
    });

    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      if (t != null) window.clearTimeout(t);
    };
  }, [pulse, hidden]);

  const style = useMemo((): React.CSSProperties => {
    const size = ZOOM_INDICATOR_SIZE;
    const { left, top } = zoomIndicatorSquareTopLeftCss(x, y, size);
    return {
      position: "absolute",
      left,
      top,
      width: size,
      height: size,
      borderRadius: "9999px",
      border: `2px solid ${ZOOM_INDICATOR_COLOR}`,
      boxSizing: "border-box",
      opacity: hidden ? 0 : opacity,
      transition: hidden
        ? "none"
        : zoomIndicatorOpacityTransitionCss(
            phase,
            ZOOM_INDICATOR_FADE_IN_MS,
            ZOOM_INDICATOR_FADE_OUT_MS,
          ),
      pointerEvents: "none",
      zIndex: 9999,
    };
  }, [hidden, opacity, phase, x, y]);

  return <div aria-hidden="true" style={style} />;
}

