"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Menus as MenuConsts } from "./ComponentConstants";
import { lerp } from "./Utils";

export function useAnimatedOpacity(
  durationMs = MenuConsts.BACKDROP_INTERP_TOGGLE_MS,
) {
  const [opacity, setOpacity] = useState(0);
  const opacityRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const setImmediate = useCallback(
    (value: number) => {
      cancelAnimation();
      const clamped = Math.min(1, Math.max(0, value));
      opacityRef.current = clamped;
      setOpacity(clamped);
    },
    [cancelAnimation],
  );

  const animateTo = useCallback(
    (target: number) => {
      cancelAnimation();
      const from = opacityRef.current;
      const to = Math.min(1, Math.max(0, target));
      if (from === to) {
        setImmediate(to);
        return;
      }
      const startMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      const tick = (nowMs: number) => {
        const elapsed = nowMs - startMs;
        const t = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1;
        const next = lerp(from, to, t);
        opacityRef.current = next;
        setOpacity(next);
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [cancelAnimation, durationMs, setImmediate],
  );

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  return { opacity, setImmediate, animateTo };
}
