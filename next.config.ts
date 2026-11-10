import type { NextConfig } from "next";

/** Enables SharedArrayBuffer for @sqlite.org/sqlite-wasm OPFS persistence in the browser. */
const crossOriginIsolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // credentialless: cross-origin tiles (Cesium/OSM) load without CORP; still isolates the page.
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16.4+ typechecks via `tsc` against the full tsconfig by default.
  // Keep IDE checking on tsconfig.json; production builds skip test trees.
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
  // CARTO basemap keys are intended for browser tile URLs; inline for Cesium.
  env: {
    NEXT_PUBLIC_CARTO_API_KEY: process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...crossOriginIsolationHeaders],
      },
      {
        source: "/cesium/:path*.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/:path*.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
