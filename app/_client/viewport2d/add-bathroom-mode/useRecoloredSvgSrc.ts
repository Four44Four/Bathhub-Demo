"use client";

import { useEffect, useState } from "react";

import { recoloredBlackSvgDataUrl } from "../../pure/svg/RecolorBlackSvg";

export function useRecoloredSvgSrc(
  publicPath: string,
  targetColor: string,
): string | undefined {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    void fetch(publicPath)
      .then((response) => response.text())
      .then((svgMarkup) => {
        if (cancelled) return;
        setSrc(recoloredBlackSvgDataUrl(svgMarkup, targetColor));
      })
      .catch(() => {
        if (!cancelled) setSrc(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [publicPath, targetColor]);

  return src;
}
