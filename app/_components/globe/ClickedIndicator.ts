import type * as CesiumTypes from "cesium";

import { ClickedIndicator as ClickedIndicatorConsts } from "../ComponentConstants";

type ClickedIndicatorApi = {
  setLatLonDegrees: (lat: number, lon: number) => void;
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
  const ellipsoid = scene.globe.ellipsoid;

  const positionValue = new Cesium.Cartesian3(0, 0, 0);

  const position = new Cesium.ConstantPositionProperty(positionValue);

  const entity = viewer.entities.add({
    name: "ClickedIndicator",
    show: false,
    position,
    billboard: {
      image: ClickedIndicatorConsts.IMAGE,
      width: ClickedIndicatorConsts.SIZE,
      height: ClickedIndicatorConsts.SIZE,
      color: Cesium.Color.fromCssColorString(ClickedIndicatorConsts.COLOR).withAlpha(
        ClickedIndicatorConsts.OPACITY,
      ),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  const request = () => scene.requestRender();

  const recompute = () => {
    if (!hasPoint) return;
    // Fixed world-space lift to avoid any surface intersection artifacts.
    const heightM = 10;
    const latRad = Cesium.Math.toRadians(latDeg);
    const lonRad = Cesium.Math.toRadians(lonDeg);
    Cesium.Cartesian3.fromRadians(lonRad, latRad, heightM, ellipsoid, positionValue);
    position.setValue(positionValue);
  };

  return {
    setLatLonDegrees: (lat, lon) => {
      hasPoint = true;
      latDeg = lat;
      lonDeg = lon;
      recompute();
      entity.show = true;
      request();
    },
    clear: () => {
      hasPoint = false;
      entity.show = false;
      request();
    },
    destroy: () => {
      viewer.entities.remove(entity);
      request();
    },
  };
}

