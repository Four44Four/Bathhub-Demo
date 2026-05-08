
"use client";

import { Button, TextWeight } from "./_components/Button";
import { GlobeViewport } from "./_components/GlobeViewport";
import { CesiumAttribution } from "./_components/CesiumAttribution";
// import Image from "next/image";

import * as ServerDebug from "./server/Debug";

/** When set to `"100%"`, the globe mount fills the virtual phone frame (see `layout.tsx`) and the initial camera distance is chosen so the globe “covers” the view (no letterboxing; excess clips on the shorter axis). */
const GLOBE_VIEWPORT_WIDTH = "100%";
const GLOBE_VIEWPORT_HEIGHT = "100%";

export default function Home() {
  const mapInitLat = 0.0;
  const mapInitLong = 0.0;

/* <div className="p-6">
        <Image src="/bathhub_logo_no_bg.svg" alt="Bathhub Logo"
               width={48} height={48}
               style={{ display: "inline-block" }} />
        <h1 className="text-2xl font-semibold" style={{ display: "inline-block" }} >Bathhub</h1>
        <p className="mt-2 text-sm opacity-80">
          Interactive globe centered on ({mapInitLat}, {mapInitLong})
        </p>
      </div> */

  return (
    <main className="flex h-full min-h-0 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <GlobeViewport
            initLat={mapInitLat}
            initLong={mapInitLong}
            width={GLOBE_VIEWPORT_WIDTH}
            height={GLOBE_VIEWPORT_HEIGHT}
          />
          <div className="pointer-events-none absolute inset-0 z-20">
            <Button
              text="Example"
              x={16}
              y={48}
              onClick={() => {
                ServerDebug.log("1");
                console.log(1);
              }}
            />
            <Button
              imageSrc="/bathhub_logo_no_bg.svg"
              x={16}
              y={104}
              onClick={() => {
                ServerDebug.log("2");
                console.log(2);
              }}
            />
            <Button
              text="Bathhub"
              textWeight={TextWeight.BOLD}
              imageSrc="/bathhub_logo_no_bg.svg"
              imageTextOffset={5}
              x={16}
              y={160}
              onClick={() => {
                ServerDebug.log("3");
                console.log(3);
              }}
            />
            <Button
              text="Bathhub"
              textWeight={TextWeight.LIGHT}
              imageSrc="/bathhub_logo_no_bg.svg"
              imageLeftOfText={false}
              imageTextOffset={20}
              x={16}
              y={216}
              zIndex={1}
              onClick={() => {
                ServerDebug.log("4");
                console.log(4);
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
