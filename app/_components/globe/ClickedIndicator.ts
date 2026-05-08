import type * as CesiumTypes from "cesium";
import { CLICKED_INDICATOR_IMAGE } from "../ComponentConstants";

// Screen-space sizing (in CSS pixels). This stays constant regardless of zoom.
export const CLICKED_INDICATOR_SIZE = 50;

export const CLICKED_INDICATOR_COLOR = "#FFF";
export const CLICKED_INDICATOR_OPACITY = 1.0;

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
      image: CLICKED_INDICATOR_IMAGE,
      width: CLICKED_INDICATOR_SIZE,
      height: CLICKED_INDICATOR_SIZE,
      color: Cesium.Color.fromCssColorString(CLICKED_INDICATOR_COLOR).withAlpha(
        CLICKED_INDICATOR_OPACITY,
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

