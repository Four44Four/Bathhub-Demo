/** Matches `package.json` / Docker `public/cesium` copy. */
const CESIUM_VERSION = "1.141.0";

const CESIUM_CDN_BASE = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium`;

type CesiumNamespace = typeof import("cesium");

type CesiumWindow = Window & {
  Cesium?: CesiumNamespace;
  CESIUM_BASE_URL?: string;
};

/** Base URL for Workers/Assets/Widgets (no trailing slash). */
export function resolveCesiumBaseUrl(): string {
  if (typeof window === "undefined") return CESIUM_CDN_BASE;
  if (process.env.NODE_ENV === "production") {
    return new URL("/cesium", window.location.origin).href;
  }
  return CESIUM_CDN_BASE;
}

function ensureCesiumWidgetCss(baseUrl: string): void {
  const id = "bathhub-cesium-widgets-css";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `${baseUrl}/Widgets/widgets.css`;
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>('script[data-bathhub-cesium="1"]');
  if (existing) {
    if (existing.src === src) {
      return existing.dataset.loaded === "1"
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
              once: true,
            });
          });
    }
    existing.remove();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.bathhubCesium = "1";
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Load the official Cesium build at runtime instead of bundling it. Turbopack's
 * production bundle of `import("cesium")` can leave the globe canvas black even
 * when `/cesium` workers resolve.
 */
export async function loadCesium(): Promise<CesiumNamespace> {
  if (typeof window === "undefined") {
    throw new Error("loadCesium must run in the browser");
  }

  const w = window as CesiumWindow;
  if (w.Cesium) return w.Cesium;

  const baseUrl = resolveCesiumBaseUrl();
  w.CESIUM_BASE_URL = baseUrl;
  ensureCesiumWidgetCss(baseUrl);
  await loadScript(`${baseUrl}/Cesium.js`);

  if (!w.Cesium) {
    throw new Error("Cesium.js loaded but window.Cesium is undefined");
  }
  return w.Cesium;
}
