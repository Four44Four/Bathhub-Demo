"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clamp01, lerp } from "./Utils";

/**
 * Animates a 0–1 value linearly toward `target` over `durationMs`.
 * Avoids CSS transitions on colors, which interpolate in RGB and produce
 * unintended hues when blending toward brightness-inverted endpoints.
 */
export function useAnimatedLinear01(target: number, durationMs: number): number {
  const [value, setValue] = useState(() => clamp01(target));
  const valueRef = useRef(clamp01(target));
  const animFrameRef = useRef<number | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const to = clamp01(target);
    const from = valueRef.current;
    if (from === to) {
      return;
    }

    cancelAnimation();
    const startMs =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (nowMs: number) => {
      const elapsed = nowMs - startMs;
      const t = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1;
      const next = lerp(from, to, t);
      valueRef.current = next;
      setValue(next);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return cancelAnimation;
  }, [cancelAnimation, durationMs, target]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  return value;
}
