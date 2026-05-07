"use client";

import React from "react";

export function CesiumAttribution() {
  return (
    <div className="mt-3 text-[11px] leading-[1.2] opacity-80">
      <span>
        Powered by{" "}
        <a
          className="underline underline-offset-2"
          href="https://cesium.com/"
          target="_blank"
          rel="noreferrer"
        >
          Cesium
        </a>
        .
      </span>{" "}
      <span>
        Map data ©{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
        .
      </span>{" "}
      <span>
        Some tiles ©{" "}
        <a
          className="underline underline-offset-2"
          href="https://carto.com/attributions"
          target="_blank"
          rel="noreferrer"
        >
          CARTO
        </a>
        .
      </span>
    </div>
  );
}

