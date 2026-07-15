import type * as CesiumTypes from "cesium";

import {
  monoIconBakedBillboardTint,
  resolveMonoIconBillboardImage,
  type MonoIconBillboardMode,
} from "../pure/svg/ResolveMonoIconBillboardImage";

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
  horizontalOrigin?: CesiumTypes.HorizontalOrigin;
  verticalOrigin?: CesiumTypes.VerticalOrigin;
  /**
   * When set, fetches a black mono-color SVG `image` and prepares it for Cesium:
   * `baked` recolors fills to `color`; `tint` recolors fills to white and keeps `color` as billboard tint.
   */
  monoColorIconMode?: MonoIconBillboardMode;
};

export type GlobeImageHandle = {
  setLatLonDegrees: (lat: number, lon: number) => void;
  setVisible: (visible: boolean) => void;
  /** Updates billboard tint and alpha (RGB from CSS color, multiplied with the texture). */
  setBillboardTint: (colorCss: string, opacity: number) => void;
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
    // Fixed world-space lift to avoid any surface intersection artifacts.
    heightAboveEllipsoidM = 10,
    horizontalOrigin: horizontalOriginOpt,
    verticalOrigin: verticalOriginOpt,
    monoColorIconMode,
  } = options;

  const bakedTint =
    monoColorIconMode === "baked"
      ? monoIconBakedBillboardTint(opacity)
      : { color, opacity };

  const scene = viewer.scene;
  const ellipsoid = scene.globe.ellipsoid;

  const positionValue = new Cesium.Cartesian3(0, 0, 0);
  const position = new Cesium.ConstantPositionProperty(positionValue);

  const billboardColor = new Cesium.ConstantProperty(
    Cesium.Color.fromCssColorString(bakedTint.color).withAlpha(bakedTint.opacity),
  );

  const entity = viewer.entities.add({
    name,
    show: false,
    position,
    billboard: {
      image,
      width: size,
      height: size,
      color: billboardColor,
      horizontalOrigin: horizontalOriginOpt ?? Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: verticalOriginOpt ?? Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  const requestRender = () => scene.requestRender();

  if (monoColorIconMode != null) {
    void resolveMonoIconBillboardImage(image, monoColorIconMode, color)
      .then((resolvedImage) => {
        if (entity.billboard == null) return;
        entity.billboard.image = new Cesium.ConstantProperty(resolvedImage);
        requestRender();
      })
      .catch(() => {
        // Keep the unresolved public path if recoloring fails.
      });
  }

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
    setBillboardTint: (colorCss: string, opacity: number) => {
      billboardColor.setValue(Cesium.Color.fromCssColorString(colorCss).withAlpha(opacity));
      requestRender();
    },
    destroy: () => {
      viewer.entities.remove(entity);
      requestRender();
    },
  };
}
