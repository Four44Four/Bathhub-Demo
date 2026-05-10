import type * as CesiumTypes from "cesium";

export type GlobeImageInitOptions = {
  /** Entity label in the viewer entity collection */
  name?: string;
  /** CSS color string applied to the billboard tint */
  color: string;
  opacity: number;
  /** Image URL or path for the billboard texture */
  image: string;
  /** Billboard width and height in CSS pixels (fixed screen size, no distance scaling) */
  size: number;
  /** Meters above the globe ellipsoid surface */
  heightAboveEllipsoidM?: number;
};

export type GlobeImageHandle = {
  setLatLonDegrees: (lat: number, lon: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

export function installGlobeImage(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
  options: GlobeImageInitOptions,
): GlobeImageHandle {
  const {
    name = "GlobeImage",
    color,
    opacity,
    image,
    size,
    heightAboveEllipsoidM = 0,
  } = options;

  const scene = viewer.scene;
  const ellipsoid = scene.globe.ellipsoid;

  const positionValue = new Cesium.Cartesian3(0, 0, 0);
  const position = new Cesium.ConstantPositionProperty(positionValue);

  const entity = viewer.entities.add({
    name,
    show: false,
    position,
    billboard: {
      image,
      width: size,
      height: size,
      color: Cesium.Color.fromCssColorString(color).withAlpha(opacity),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  const requestRender = () => scene.requestRender();

  const setLatLonDegrees = (latDeg: number, lonDeg: number) => {
    const latRad = Cesium.Math.toRadians(latDeg);
    const lonRad = Cesium.Math.toRadians(lonDeg);
    Cesium.Cartesian3.fromRadians(
      lonRad,
      latRad,
      heightAboveEllipsoidM,
      ellipsoid,
      positionValue,
    );
    position.setValue(positionValue);
    requestRender();
  };

  return {
    setLatLonDegrees,
    setVisible: (visible) => {
      entity.show = visible;
      requestRender();
    },
    destroy: () => {
      viewer.entities.remove(entity);
      requestRender();
    },
  };
}
