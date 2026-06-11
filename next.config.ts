import type { NextConfig } from "next";

/** Enables SharedArrayBuffer for @sqlite.org/sqlite-wasm OPFS persistence in the browser. */
const crossOriginIsolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // credentialless: cross-origin tiles (Cesium/OSM) load without CORP; still isolates the page.
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
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
