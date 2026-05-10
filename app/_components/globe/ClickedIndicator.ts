import type * as CesiumTypes from "cesium";

import { ClickedIndicator as ClickedIndicatorConsts } from "../ComponentConstants";
import { installGlobeImage } from "./GlobeImage";

type ClickedIndicatorApi = {
  setLatLonDegrees: (lat: number, lon: number) => void;
  /** Current marker position in degrees, or `null` if cleared / never set. */
  getLatLonDegrees: () => { lat: number; lon: number } | null;
  clear: () => void;
  destroy: () => void;
};

export function installClickedIndicator(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
): ClickedIndicatorApi {
  let hasPoint = false;
  let latDeg = 0;
  let lonDeg = 0;

  const scene = viewer.scene;

  const globeImage = installGlobeImage(Cesium, viewer, {
    name: "ClickedIndicator",
    color: ClickedIndicatorConsts.COLOR,
    opacity: ClickedIndicatorConsts.OPACITY,
    image: ClickedIndicatorConsts.IMAGE,
    size: ClickedIndicatorConsts.SIZE,
  });

  const request = () => scene.requestRender();

  const recompute = () => {
    if (!hasPoint) return;
    globeImage.setLatLonDegrees(latDeg, lonDeg);
  };

  return {
    setLatLonDegrees: (lat, lon) => {
      hasPoint = true;
      latDeg = lat;
      lonDeg = lon;
      recompute();
      globeImage.setVisible(true);
      request();
    },
    getLatLonDegrees: () => {
      if (!hasPoint) return null;
      return { lat: latDeg, lon: lonDeg };
    },
    clear: () => {
      hasPoint = false;
      globeImage.setVisible(false);
      request();
    },
    destroy: () => {
      globeImage.destroy();
      request();
    },
  };
}
