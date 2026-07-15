import type * as CesiumTypes from "cesium";

import { ClickedIndicator as ClickedIndicatorConsts } from "../ComponentConstants";
import { installGlobeImage } from "./GlobeImage";

type ClickedIndicatorApi = {
  setLatLonDegrees: (lat: number, lon: number) => void;
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
    monoColorIconMode: "baked",
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
    destroy: () => {
      globeImage.destroy();
      request();
    },
  };
}
