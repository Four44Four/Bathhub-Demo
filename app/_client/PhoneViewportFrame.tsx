"use client";

import type { CSSProperties, ReactNode } from "react";

import { PhoneViewport as PhoneViewportConsts } from "./ComponentConstants";
import {
  PHONE_VIEWPORT_CORNERS,
  phoneViewportCornerCoverDraw,
  phoneViewportFullRoundedClipPath,
  type PhoneViewportCorner,
} from "./pure/PhoneViewportClip";

export type PhoneViewportFrameProps = {
  children: ReactNode;
  backgroundColor: string;
};

function cornerCoverPositionStyle(
  corner: PhoneViewportCorner,
  radiusPx: number,
): CSSProperties {
  const size = radiusPx;
  const base: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    pointerEvents: "none",
    zIndex: PhoneViewportConsts.CORNER_COVER_Z_INDEX,
  };
  switch (corner) {
    case "topLeft":
      return { ...base, top: 0, left: 0 };
    case "topRight":
      return { ...base, top: 0, right: 0 };
    case "bottomRight":
      return { ...base, bottom: 0, right: 0 };
    case "bottomLeft":
      return { ...base, bottom: 0, left: 0 };
  }
}

/**
 * Rounded phone-shaped shell.
 *
 * CSS `overflow`/`clip-path` alone is not enough: Firefox WebRender composites
 * Cesium's WebGL canvas as its own surface and ignores distant rounded clips.
 * Opaque SVG corner wedges sit *outside* the clipped shell (siblings, not
 * descendants) so they are not themselves clipped away, and paint over leaked
 * WebGL pixels with the page side background color.
 */
export function PhoneViewportFrame({
  children,
  backgroundColor,
}: PhoneViewportFrameProps) {
  const radiusPx = PhoneViewportConsts.CORNER_RADIUS_PX;

  return (
    <div
      className="relative"
      style={{
        aspectRatio: "9 / 16",
        // Always fit the full phone height inside the browser viewport (no scrolling).
        // Use dynamic viewport units to avoid mobile browser URL bar causing scroll.
        height: "min(100dvh, calc(100vw * 16 / 9))",
        width: "min(100vw, calc(100dvh * 9 / 16))",
        maxWidth: "100vw",
        maxHeight: "100dvh",
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden shadow-2xl"
        style={{
          backgroundColor,
          borderRadius: radiusPx,
          outline: `1px solid ${PhoneViewportConsts.OUTLINE_COLOR}`,
          clipPath: phoneViewportFullRoundedClipPath(radiusPx),
          isolation: "isolate",
        }}
      >
        <div className="h-full w-full">{children}</div>
      </div>
      {PHONE_VIEWPORT_CORNERS.map((corner) => {
        const cover = phoneViewportCornerCoverDraw(corner, radiusPx);
        return (
          <svg
            key={corner}
            aria-hidden
            width={radiusPx}
            height={radiusPx}
            viewBox={`0 0 ${radiusPx} ${radiusPx}`}
            style={cornerCoverPositionStyle(corner, radiusPx)}
          >
            <path
              d={cover.path}
              transform={cover.transform}
              fill={PhoneViewportConsts.CORNER_COVER_COLOR}
            />
          </svg>
        );
      })}
    </div>
  );
}
