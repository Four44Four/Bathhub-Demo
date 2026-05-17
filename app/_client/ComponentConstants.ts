"use client";

import * as Fonts from "../_server/Fonts";
import { PathColorMode } from "./globe/Path";

export const Shared = {
    FONT_REGULAR_CLASS: Fonts.NOTOSANS_REGULAR_CLASS,
    FONT_BOLD_CLASS: Fonts.NOTOSANS_BOLD_CLASS,
    FONT_LIGHT_CLASS: Fonts.NOTOSANS_LIGHT_CLASS,
} as const;

export const Button = {
    CORNER_RADIUS: 8,
    DEFAULT_FILL_COLOR: "#0E0F11",
    DEFAULT_LINE_COLOR: "#20232D",
    LINE_THICKNESS: 1,
    TEXT_COLOR: "#AFB4C6",
} as const;

export const ClickedIndicator = {
    // Screen-space sizing (in CSS pixels). This stays constant regardless of zoom.
    SIZE: 50,
    // Public asset path for the clicked-location indicator.
    // Default points at `./public/bathhub_logo_no_bg.svg`.
    IMAGE: "/bathhub_logo_no_bg.svg",
    COLOR: "#FFF",
    OPACITY: 1.0,
} as const;

export const MapMarker = {
    SIZE: 50,
    IMAGE: "/bathhub_map_marker.svg",
    COLOR: "#FFF",
    OPACITY: 1.0,
} as const;

export const DebugCrosshair = {
    ENABLED: true,
    IMAGE: "/crosshairs.svg",
    /** Default billboard tint when idle / after blend completes (CSS hex). */
    BASE_COLOR: "#FF0000",
    /** Flash highlight color when the viewport center is resampled (CSS hex). */
    SECONDARY_COLOR: "#FF9696",
    /** Screen-space width/height in CSS pixels */
    SIZE: 20,
    /** Milliseconds for billboard opacity to fade from 1 to 0 after each sample. */
    FADE_OUT_MS: 1000,
    /** Milliseconds to blend tint from {@link DebugCrosshair.SECONDARY_COLOR} back to {@link DebugCrosshair.BASE_COLOR}. */
    BLEND_OUT_COLORS_MS: 500,
} as const;

export const Globe = {    
    // Target initial zoom level after geolocation is granted/processed:
    // distance from the globe surface (meters).
    CAMERA_INIT_SURFACE_OFFSET: 1500,
    ANIMATE_ON_INIT: true,
    ANIMATE_ON_INIT_DURA: 1500,

    WATER_COLOR: "#41457E",
    LAND_COLOR: "#323255",

    ZOOM_SENS: 0.01,
    ROTATE_MIN: 0.00005,
    ZOOM_MIN: 0.00005,
    ZOOM_DECAY_FACTOR: 1.0,

    // Minimum clearance above the globe surface (meters). Smaller => you can zoom closer.
    MIN_SURFACE_CLEARANCE_M: 250,

    /** Sample interval while dragging, pinching, wheel-zoom smoothing, or programmatic camera animation is active. */
    UPDATE_VIEWPORT_CENTER_DELAY_MS: 50,
    /**
     * After this many milliseconds with no active globe drag/zoom/animation (`isGlobeViewportSamplerBusy`),
     * the client is treated as idle for viewport-center sampling.
     */
    VIEWPORT_DETECT_IDLE_MS: 500,
} as const;

export const Path = {
    BASE_COLOR: "#0000FF",
    SECONDARY_COLOR: "#9292FF",
    GRADIENT_SIZE_PIXELS: 50,
    GRADIENT_ROLL_PERIOD_MS: 1000,
    GRADIENT_ROLL_MAX_FPS: 30,
    COLOR_MODE: "rolling-gradient" satisfies PathColorMode,
    WIDTH_PIXELS: 8,
    OUTLINE_WIDTH_PIXELS: 24,
    STROKE_EDGE_SOFT_PIXELS: 1.25,
    MAX_POLYLINE_SAMPLES: 128,
    MIN_VERTEX_SEPARATION_PIXELS: 10,
    SURFACE_CLEARANCE_METERS: 10,
} as const;

// can't export this as const yet because `PULL_HANDLE_MARGIN_PX` relies
// on `INACTIVE_HEIGHT_PX` and `PULL_HANDLE_HEIGHT_PX`
const SwipeMenu0 = {
    INACTIVE_HEIGHT_PX: 20,
    BG_COLOR: "#FFFFFF",
    /** Fraction of viewport height the menu can expand to when fully open. */
    MAX_EXPAND_RATIO: 0.9,
    /** Pull handle pill height in CSS pixels. */
    PULL_HANDLE_HEIGHT_PX: 4,
    // ensure it's always a pill
    PULL_HANDLE_RADIUS_PX: Number.MAX_SAFE_INTEGER,
    EXPAND_SNAP_THRESHOLD_RATIO: 0.35,
    PULL_HANDLE_WIDTH_RATIO: 0.18,
    PULL_HANDLE_BG_COLOR: "#888888",
    SIDE_PADDING_PX: 10,
    PRIMARY_BTN_BG_COLOR: "#171769",
    PRIMARY_BTN_HEIGHT_PERCENTAGE: 25,
    PRIMARY_BTN_FONT_SIZE: 10,
    PRIMARY_BTN_FONT_COLOR: "#FFFFFF",
};
const SwipeMenu1 = {
    /** Inset from the menu shell edge to the pull-handle pill. */
    PULL_HANDLE_MARGIN_PX: 
        (SwipeMenu0.INACTIVE_HEIGHT_PX - SwipeMenu0.PULL_HANDLE_HEIGHT_PX) / 2,
};
export const SwipeMenu = { ...SwipeMenu0, ...SwipeMenu1 };

export const Alerts = {
    ACCENT_COLOR: "#EC3968",
    TEXT_COLOR: "#ffffff",
} as const;