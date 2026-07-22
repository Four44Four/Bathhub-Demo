"use client";

import { useEffect, useState } from "react";

import { warnIfMonoColorSvgNotUniformlyBlack } from "../pure/Image";
import {
  invertSvgMarkupHexBrightness,
  svgMarkupToDataUrl,
} from "../pure/viewport2d/ButtonInteractColor";

export type ButtonSvgInteractSrc = {
  isSvg: boolean;
  normalSrc: string | undefined;
  invertedSrc: string | undefined;
};

export function useButtonSvgInteractSrc(
  imageSrc: string | undefined,
  buildInvertedMarkup = true,
  /** When true, warn if fetched SVG fills/strokes are not uniformly black. */
  enforceMonoColorBlackPolicy = false,
): ButtonSvgInteractSrc {
  const [normalSrc, setNormalSrc] = useState<string | undefined>();
  const [invertedSrc, setInvertedSrc] = useState<string | undefined>();
  const isSvg = imageSrc != null && imageSrc.endsWith(".svg");

  useEffect(() => {
    if (!isSvg || imageSrc == null) {
      setNormalSrc(undefined);
      setInvertedSrc(undefined);
      return;
    }

    let cancelled = false;

    void fetch(imageSrc)
      .then((response) => response.text())
      .then((svgMarkup) => {
        if (cancelled) return;
        if (enforceMonoColorBlackPolicy) {
          warnIfMonoColorSvgNotUniformlyBlack(imageSrc, svgMarkup);
        }
        setNormalSrc(svgMarkupToDataUrl(svgMarkup));
        setInvertedSrc(
          buildInvertedMarkup
            ? svgMarkupToDataUrl(invertSvgMarkupHexBrightness(svgMarkup))
            : undefined,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setNormalSrc(undefined);
          setInvertedSrc(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [buildInvertedMarkup, enforceMonoColorBlackPolicy, imageSrc, isSvg]);

  return {
    isSvg,
    normalSrc: isSvg ? (normalSrc ?? imageSrc) : imageSrc,
    invertedSrc: isSvg ? invertedSrc : undefined,
  };
}
