
"use client";

import { GlobeViewport } from "./_components/GlobeViewport";
import { CesiumAttribution } from "./_components/CesiumAttribution";
import Image from "next/image";

export default function Home() {
  const mapInitLat = 0.0;
  const mapInitLong = 0.0;

  return (
    <main className="flex-1 flex flex-col">
      <div className="p-6">
        <Image src="/bathhub_logo_no_bg.svg" alt="Bathhub Logo"
               width={48} height={48}
               style={{ display: "inline-block" }} />
        <h1 className="text-2xl font-semibold" style={{ display: "inline-block" }} >Bathhub</h1>
        <p className="mt-2 text-sm opacity-80">
          Interactive globe centered on ({mapInitLat}, {mapInitLong})
        </p>
      </div>

      <div className="flex-1 min-h-[520px] px-6 pb-6">
        <div className="h-full w-full overflow-hidden rounded-xl border border-white/10">
          <GlobeViewport initLat={mapInitLat} initLong={mapInitLong} />
        </div>
        <CesiumAttribution />
      </div>
    </main>
  );
}
