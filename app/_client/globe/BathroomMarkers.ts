import type * as CesiumTypes from "cesium";

import { BathroomMapMarker as BathroomMapMarkerConsts } from "../ComponentConstants";
import { bathroomMarkerBillboardTint } from "../pure/bathroom/BathroomMarkerTint";
import {
  planBathroomMarkerSync,
  type BathroomMarkerPoolRecordWithTint,
} from "../pure/bathroom/BathroomMarkerSyncPlan";
import { type RenderedBathroomEntry, type RenderedBathroomMap } from "../pure/bathroom/RenderedBathrooms";
import { type ViewportBounds } from "../../_shared/BathroomDataPrimary";
import { installGlobeImage, type GlobeImageHandle } from "./GlobeImage";

export type BathroomMarkersSyncContext = {
  current: RenderedBathroomEntry[];
  previous?: RenderedBathroomMap;
  viewportCenter: { latitude: number; longitude: number } | null;
  viewportBounds: ViewportBounds;
  destroyDistanceFromCenterM: number;
};

export type BathroomMarkersHandle = {
  sync(context: BathroomMarkersSyncContext): void;
  /** Hides all markers without destroying pooled entities (zoomed-out cull). */
  stopRendering(): void;
  clear(): void;
  destroy(): void;
};

type MarkerRecord = BathroomMarkerPoolRecordWithTint & {
  handle: GlobeImageHandle;
};

export function installBathroomMarkers(
  Cesium: typeof CesiumTypes,
  viewer: CesiumTypes.Viewer,
): BathroomMarkersHandle {
  const markers = new Map<number, MarkerRecord>();

  const markerImageForStatus = (verifyStatus: RenderedBathroomEntry["verify_status"]) =>
    verifyStatus === "verified"
      ? BathroomMapMarkerConsts.VERIFIED_IMAGE
      : BathroomMapMarkerConsts.PENDING_IMAGE;

  const poolSnapshot = (): Map<number, BathroomMarkerPoolRecordWithTint> =>
    new Map(
      Array.from(markers.entries(), ([id, record]) => [
        id,
        {
          id,
          latitude: record.latitude,
          longitude: record.longitude,
          verify_status: record.verify_status,
          loadedFromCache: record.loadedFromCache,
        },
      ]),
    );

  const createMarker = (entry: RenderedBathroomEntry): MarkerRecord => {
    const tint = bathroomMarkerBillboardTint(entry.loadedFromCache);
    const handle = installGlobeImage(Cesium, viewer, {
      name: `BathroomMarker-${entry.id}`,
      color: tint.color,
      opacity: tint.opacity,
      image: markerImageForStatus(entry.verify_status),
      size: BathroomMapMarkerConsts.SIZE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    });
    handle.setLatLonDegrees(entry.latitude, entry.longitude);

    return {
      id: entry.id,
      latitude: entry.latitude,
      longitude: entry.longitude,
      verify_status: entry.verify_status,
      loadedFromCache: entry.loadedFromCache,
      handle,
    };
  };

  const destroyMarker = (id: number): void => {
    const record = markers.get(id);
    if (!record) return;
    record.handle.destroy();
    markers.delete(id);
  };

  const applyTint = (record: MarkerRecord, entry: RenderedBathroomEntry): void => {
    const tint = bathroomMarkerBillboardTint(entry.loadedFromCache);
    record.handle.setBillboardTint(tint.color, tint.opacity);
    record.loadedFromCache = entry.loadedFromCache;
  };

  const requestRender = () => viewer.scene.requestRender();

  return {
    sync(context) {
      const plan = planBathroomMarkerSync(
        context.current,
        context.previous,
        poolSnapshot(),
        context.viewportCenter,
        context.viewportBounds,
        context.destroyDistanceFromCenterM,
      );

      for (const id of plan.destroyIds) {
        destroyMarker(id);
      }

      for (const entry of [...plan.create, ...plan.recreate]) {
        destroyMarker(entry.id);
        const record = createMarker(entry);
        markers.set(entry.id, record);
        record.handle.setVisible(plan.showIds.has(entry.id));
      }

      for (const entry of plan.tintUpdate) {
        const record = markers.get(entry.id);
        if (record) {
          applyTint(record, entry);
        }
      }

      for (const id of plan.showIds) {
        const record = markers.get(id);
        if (!record) continue;
        record.handle.setVisible(true);
      }

      for (const id of plan.hideIds) {
        const record = markers.get(id);
        if (!record) continue;
        record.handle.setVisible(false);
      }

      requestRender();
    },
    stopRendering() {
      for (const record of markers.values()) {
        record.handle.setVisible(false);
      }
      requestRender();
    },
    clear() {
      for (const id of Array.from(markers.keys())) {
        destroyMarker(id);
      }
      requestRender();
    },
    destroy() {
      this.clear();
    },
  };
}
