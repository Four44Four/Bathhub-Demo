
"use client";

import { useEffect, useRef, useState } from "react";
import { Button, TextWeight } from "./_components/Button";
import {
  GlobeViewport,
  type GlobeViewportHandle,
} from "./_components/globe/GlobeViewport";
import { CesiumAttribution } from "./_components/CesiumAttribution";
import { ZoomIndicator } from "./_components/ZoomIndicator";
import { Globe as GlobeConsts } from "./_components/ComponentConstants";
// import Image from "next/image";

import * as ServerDebug from "./server/Debug";

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

    const onPosition = () => (pos: GeolocationPosition) => {
      if (cancelled) return;
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

    const onPositionError = () => {
      // Denial / timeout / unavailable: leave defaults at (0, 0).
    };

    const requestPosition = () => {
      navigator.geolocation.getCurrentPosition(
        onPosition(),
        onPositionError,
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      );
    };

    (async () => {
      try {
        // `navigator.permissions` isn't universally available (older Safari),
        // so this is best-effort: failure falls through to a normal prompt.
        if (navigator.permissions && typeof navigator.permissions.query === "function") {
          const status = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          if (status.state === "denied") {
            // Don't even try to prompt; defaults stay at (0, 0).
            return;
          }
        }
      } catch {
        // Permissions API unavailable or rejected — let getCurrentPosition prompt.
      }
      if (cancelled) return;
      requestPosition();
    })();

    return () => {
      cancelled = true;
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
              onClick={() => {
                ServerDebug.log("TODO: REPLACE THIS");
                console.log("TODO: REPLACE THIS");
              }}
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
