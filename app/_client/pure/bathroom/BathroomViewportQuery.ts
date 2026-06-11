import { type ViewportBounds } from "../../../_shared/BathroomDataPrimary";

/** GlobeViewport uses +Infinity until the first viewport sample after Cesium init. */
export function isGlobeViewportCameraSampleReady(cameraHeightM: number): boolean {
  return Number.isFinite(cameraHeightM) && cameraHeightM !== Number.POSITIVE_INFINITY;
}

/** Returns true when the camera is close enough to query bathrooms. */
export function isCameraCloseEnoughForBathroomQuery(
  cameraHeightM: number,
  maxQueryCameraHeightM: number,
): boolean {
  if (
    !isGlobeViewportCameraSampleReady(cameraHeightM) ||
    !Number.isFinite(maxQueryCameraHeightM)
  ) {
    return false;
  }
  return cameraHeightM <= maxQueryCameraHeightM;
}

export function isPointInViewportBounds(
  bounds: ViewportBounds,
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= bounds.lowerLeft.latitude &&
    latitude <= bounds.upperRight.latitude &&
    longitude >= bounds.lowerLeft.longitude &&
    longitude <= bounds.upperRight.longitude
  );
}
