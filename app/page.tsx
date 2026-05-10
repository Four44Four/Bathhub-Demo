
"use client";

import { useEffect, useRef, useState, RefObject } from "react";
import { Button } from "./_components/Button";
import {
  GlobeViewport,
  type GlobeViewportHandle,
} from "./_components/globe/GlobeViewport";
import { CesiumAttribution } from "./_components/CesiumAttribution";
import { ZoomIndicator } from "./_components/ZoomIndicator";
import { Globe as GlobeConsts } from "./_components/ComponentConstants";
// import Image from "next/image";

import * as ServerDebug from "./_server/Debug";
import * as ServerPathfind from "./_server/Pathfind";
import * as SharedUtils from "./_shared/Utils";

/** When set to `"100%"`, the globe mount fills the virtual phone frame (see `layout.tsx`) and the initial camera distance is chosen so the globe “covers” the view (no letterboxing; excess clips on the shorter axis). */
const GLOBE_VIEWPORT_WIDTH = "100%";
const GLOBE_VIEWPORT_HEIGHT = "100%";

/**
 * Module-level mutable globe-center coordinates. Default to (0, 0) when the
 * client has no geolocation permission (or denies the prompt). Updated to the
 * client's current position whenever geolocation data becomes available.
 *
 * Kept at module scope (rather than inside `Home()`) so the geolocation flow
 * can mutate them in place; the React state below mirrors them whenever the
 * `<GlobeViewport>` actually needs to be re-initialized.
 */
let mapInitLat = 0.0;
let mapInitLong = 0.0;

/** 
 * Current client location
 * OR
 * (if client disabled geolocation)
 * Surface point under the viewport center
 *    or last known map init if Cesium is not ready. 
 * */
function getStartPos(globe: GlobeViewportHandle | null): SharedUtils.Point {
  let retPos = globe?.getViewportCenterLatLon() ?? {
    latitude: mapInitLat,
    longitude: mapInitLong,
  };

  navigator.geolocation.getCurrentPosition(
    (posIn) => {
      retPos = { 
        latitude: posIn.coords.latitude, 
        longitude: posIn.coords.longitude 
      };
    });

  return retPos;
}

async function onTestPathfindClick(globeRef: RefObject<GlobeViewportHandle | null>) {
  const startPos = getStartPos(globeRef.current);
  const endPos = globeRef.current?.getClickedIndicatorLatLon();
  if (endPos == null) {
    // TODO: replace with error popup handler
    alert("No point picked !!");
    return;
  }

  const pathDataErrorable: SharedUtils.Errorable<ServerPathfind.PathData> 
    = await ServerPathfind.getPathBetweenPoints({
        profile: "foot-walking",
        startLatitude: startPos.latitude,
        startLongitude: startPos.longitude,
        endLatitude: endPos.latitude,
        endLongitude: endPos.longitude,
      });

  if (pathDataErrorable.errorMsg) {
    // TODO: replace with error popup handler
    alert(pathDataErrorable.errorMsg);
  } 
  else {
    const pathDataStr = JSON.stringify(pathDataErrorable.val);
    ServerDebug.log(pathDataStr);
    console.log(pathDataStr);  
  }
}

export default function Home() {
  const globeRootRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeViewportHandle | null>(null);
  const [zoomIndicator, setZoomIndicator] = useState<{ x: number; y: number; pulse: number }>({
    x: 0,
    y: 0,
    pulse: 0,
  });
  // Mirrors the module-level mapInitLat/mapInitLong. Updating this state
  // re-renders Home() and feeds new initLat/initLong props into <GlobeViewport>,
  // which causes its useEffect to tear down + re-init the Cesium viewer.
  // We only update it for the "permission already granted" case so the
  // "accepted later" case can use the cheap animation path instead.
  const [globeInit, setGlobeInit] = useState<{ lat: number; long: number }>({
    lat: mapInitLat,
    long: mapInitLong,
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    /** Ensures we only run the init animation once. */
    let appliedUserLocation = false;
    let watchId: number | null = null;

    // Omit `timeout` so the browser waits indefinitely while the permission prompt is open.
    const geoOptions: PositionOptions = {
      enableHighAccuracy: false,
      maximumAge: 60_000,
    };

    const clearWatch = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const applyGeolocationPosition = (pos: GeolocationPosition) => {
      if (cancelled || appliedUserLocation) return;
      appliedUserLocation = true;
      clearWatch();
      const lat = pos.coords.latitude;
      const long = pos.coords.longitude;
      mapInitLat = lat;
      mapInitLong = long;
      if (GlobeConsts.ANIMATE_ON_INIT) {
        // ANIMATE_ON_INIT is true: animate the existing globe to the
        // user's location instead of jumping to it.
        globeRef.current?.animateTo(lat, long, GlobeConsts.ANIMATE_ON_INIT_DURA);
        globeRef.current?.animateZoomToInitTarget(GlobeConsts.ANIMATE_ON_INIT_DURA);
      } else {
        // Initialize the JSX at the calculated lat/long: setting state
        // re-renders Home() and re-mounts the globe at the user's location.
        setGlobeInit({ lat, long });
        // The viewer is about to be torn down + re-initialized. If we snap *now*
        // it will apply to the old viewer and then immediately get destroyed.
        // Defer so the call targets the newly-mounted GlobeViewport, which will
        // queue/replay the snap after Cesium finishes loading.
        requestAnimationFrame(() => {
          globeRef.current?.snapZoomToInitTarget();
        });
      }
    };

    const onPositionError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      // Hard denial ends the watch; other codes may be transient (Firefox).
      if (err.code === err.PERMISSION_DENIED) {
        clearWatch();
      }
    };

    /** Firefox: do not `await` anything before registering geolocation — a deferred
     * `getCurrentPosition` can leave the request untied from the permission prompt so
     * neither success nor error runs after a slow Allow. `watchPosition` keeps a live
     * subscription until the first fix (works better than one-shot here). */
    const startWatch = () => {
      if (cancelled || appliedUserLocation) return;
      clearWatch();
      console.log("ok")
      watchId = navigator.geolocation.watchPosition(
        applyGeolocationPosition,
        onPositionError,
        geoOptions,
      );
    };

    startWatch();

    const retryIfStillWaiting = () => {
      if (cancelled || appliedUserLocation) return;
      if (document.visibilityState !== "visible") return;
      startWatch();
    };
    window.addEventListener("focus", retryIfStillWaiting);
    document.addEventListener("visibilitychange", retryIfStillWaiting);

    return () => {
      cancelled = true;
      clearWatch();
      window.removeEventListener("focus", retryIfStillWaiting);
      document.removeEventListener("visibilitychange", retryIfStillWaiting);
    };
  }, []);

/* <div className="p-6">
        <Image src="/bathhub_logo_no_bg.svg" alt="Bathhub Logo"
               width={48} height={48}
               style={{ display: "inline-block" }} />
        <h1 className="text-2xl font-semibold" style={{ display: "inline-block" }} >Bathhub</h1>
        <p className="mt-2 text-sm opacity-80">
          Interactive globe centered on ({globeInit.lat}, {globeInit.long})
        </p>
      </div> */

  return (
    <main className="flex h-full min-h-0 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={globeRootRef} className="relative min-h-0 flex-1 overflow-hidden">
          <GlobeViewport
            ref={globeRef}
            initLat={globeInit.lat}
            initLong={globeInit.long}
            width={GLOBE_VIEWPORT_WIDTH}
            height={GLOBE_VIEWPORT_HEIGHT}
            zoomIndicatorRootRef={globeRootRef}
            onZoomIndicatorPulse={(x, y) => {
              setZoomIndicator((z) => ({ x, y, pulse: z.pulse + 1 }));
            }}
          />
          <ZoomIndicator
            x={zoomIndicator.x}
            y={zoomIndicator.y}
            pulse={zoomIndicator.pulse}
            hidden={zoomIndicator.pulse === 0}
          />
          <div className="pointer-events-none absolute inset-0 z-20">
            <Button
              text="Test pathfind"
              x={16}
              y={48}
              onClick={() => onTestPathfindClick(globeRef)}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-3">
          <div className="pointer-events-auto">
            <CesiumAttribution />
          </div>
        </div>
      </div>
    </main>
  );
}
