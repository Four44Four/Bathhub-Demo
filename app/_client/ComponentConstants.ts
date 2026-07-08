"use client";

import * as Fonts from "../_server/Fonts";
import { PathColorMode } from "./globe/Path";
import { lerpHex } from "./pure/HexColor";

export const Shared = {
    FONT_REGULAR_CLASS: Fonts.NOTOSANS_REGULAR_CLASS,
    FONT_BOLD_CLASS: Fonts.NOTOSANS_BOLD_CLASS,
    FONT_LIGHT_CLASS: Fonts.NOTOSANS_LIGHT_CLASS,
    NEGATIVE_COLOR: "#E06C89",
    POSITIVE_COLOR: "#6CE0D1",
    /** Icon color on tinted viewport2d action buttons (cancel, confirm, exit). */
    ICON_ON_TINTED_BUTTON_COLOR: "#ffffff",
} as const;

export const Button = {
    CORNER_RADIUS: 8,
    DEFAULT_FILL_COLOR: "#0E0F11",
    DEFAULT_LINE_COLOR: "#20232D",
    LINE_THICKNESS: 1,
    TEXT_COLOR: "#AFB4C6",
} as const;

export const BtnInteractAnim = {
    BTN_INTERACT_DURA_MS: 500,
    /** Multiplier applied to button colors' brightness while hovered or pressed. */
    BTN_COLOR_VALUE_FACTOR_MULT: 0.7,
} as const;

/** Circular dismiss control (user settings close, exit find-bathroom mode, etc.). */
export const CircularCloseButton = {
    SIZE_PX: 44,
    FILL: Shared.NEGATIVE_COLOR,
    TEXT_COLOR: "#FFFFFF",
    FONT_SIZE_PX: 22,
    BOX_SHADOW: "0 2px 8px rgba(18, 18, 47, 0.25)",
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

export const AddBathroom = {
    /** CSS pixel height of the cancel (X) and confirm (✓) action buttons. */
    ACTION_BUTTON_HEIGHT_PX: 50,
    /** Screen-space height of the cancel/confirm icon images. */
    ACTION_ICON_SIZE_PX: 22,
    CANCEL_ICON: "/cross.svg",
    CONFIRM_ICON: "/checkmark.svg",
    ACTION_BUTTON_SIDE_MARGIN_PX: 12,
    ACTION_BUTTON_GAP_PX: 8,
    ACTION_BUTTON_BOTTOM_MARGIN_PX: 16,
    MARKER_SIZE_PX: MapMarker.SIZE,
    MARKER_IMAGE: "/bathhub_add_new_map_marker.svg",
    MARKER_OPACITY: MapMarker.OPACITY,
    /** Spinner diameter in CSS pixels while a create request is in flight. */
    LOADING_SPINNER_SIZE_PX: 40,
    /** Server create request timeout per add-bathroom spec (milliseconds). */
    REQUEST_TIMEOUT_MS: 15_000,
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
    ANIMATE_ON_INIT_DURA: 1500,
    /**
     * Wall-clock time for user mouse-wheel smooth zoom to reach the target in log-range space
     * (altitude-independent). Programmatic zoom uses {@link Globe.ANIMATE_ON_INIT_DURA} unless
     * a duration is passed explicitly.
     */
    MOUSE_SCROLL_WHEEL_LERP_TIME_MS: 1000,

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
     * After this many milliseconds with no mouse or pointer input on the globe,
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
    /** Debounce before rebuilding path LOD geometry after the client becomes idle (milliseconds). */
    PATH_REBUILD_LOD_GEOM_DEBOUNCE_MS: 500,
    /** Base ellipsoid height (m) for path vertices at low camera altitudes. */
    SURFACE_CLEARANCE_METERS: 10,
    /**
     * Extra clearance per meter of camera altitude above the ellipsoid. Scales path height
     * when zoomed out so the ribbon stays above the globe depth buffer without visibly
     * lifting off the map at street-level zoom.
     */
    SURFACE_CLEARANCE_RAISE_FACTOR: 2e-4,
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
    SHADOW_ALPHA_FACTOR: 0.5,
    /** Upward shadow height in CSS pixels from the shadow start below the top corners. */
    SHADOW_ALPHA_HEIGHT_PX: 50,
    /** Menu shell top corner radius in CSS pixels. */
    TOP_CORNER_RADIUS_PX: 12,
    SIDE_PADDING_PX: 10,
    PRIMARY_BTN_BG_COLOR: "#FFFFFF",
    PRIMARY_BTN_HEIGHT_PX: 100,
    PRIMARY_BTN_FONT_SIZE: 10,
    PRIMARY_BTN_FONT_COLOR: "#B5B5C4",
    BTN_INTERACT_BG_COLOR: "#E6E6F0",
    BTN_INTERACT_FG_VALUE_FACTOR: 0.7,
    PRIMARY_BTN_IMG_WIDTH_RATIO: 0.5,
    PRIMARY_BTN_WIDTH_RATIO: 0.25,
    /** Box-shadow alpha for primary menu buttons (`rgba(18, 18, 47, α)`). */
    PRIMARY_BTN_SHADOW_ALPHA: 0.25,
};
const SwipeMenu1 = {
    /** Inset from the menu shell edge to the pull-handle pill. */
    PULL_HANDLE_MARGIN_PX: 
        (SwipeMenu0.INACTIVE_HEIGHT_PX - SwipeMenu0.PULL_HANDLE_HEIGHT_PX) / 2,
};
export const SwipeMenu = { ...SwipeMenu0, ...SwipeMenu1 };

export const Alerts = {
    NEGATIVE_ACCENT_COLOR: "#EC3968",
    POSITIVE_ACCENT_COLOR: "#7BE3C7",
    TEXT_COLOR: "#ffffff",
    /** Default duration band alerts stay on screen before auto-hiding (milliseconds). */
    BAND_ALERT_AUTO_HIDE_MS: 3_000,
    /** Maximum band alerts stacked on screen; oldest are removed when exceeded. */
    BAND_ALERT_MAX_STACK: 5,
    BAND_ALERT_Z_INDEX: 60,
    BAND_ALERT_FONT_SIZE_PX: 13,
    BAND_ALERT_LINE_HEIGHT: 1.3,
    BAND_ALERT_PADDING: "8px 12px",
} as const;

export const Menus = {
    /** Milliseconds to fade the globe backdrop when a menu is toggled. */
    BACKDROP_INTERP_TOGGLE_MS: 100,
    /** Globe dim overlay color while the swipe-up menu is open (CSS rgba). */
    BACKDROP_COLOR: "rgba(12, 13, 18, 0.62)",
} as const;

export const SchemaLoadingScreen = {
    /** Milliseconds for the slide-down dismiss animation. */
    ANIMATE_OUT_MS: 500,
} as const;

const UserSettings0 = {
    /** Full-screen user settings overlay; above swipe menu and viewport controls. */
    OVERLAY_Z_INDEX: 50,
    CLOSE_BTN_SIZE_PX: CircularCloseButton.SIZE_PX,
    CLOSE_BTN_INSET_PX: 16,
    HEADER_FONT_SIZE_PX: 22,
    HEADER_HORIZONTAL_PADDING_PX: 16,
    HEADER_TEXT_COLOR: "#0E0F11",
    HEADER_SEPARATOR_BRIGHTNESS_RATIO: 0.7,
    PAGE_BG: "#FFFFFF",
    ROW_BORDER_COLOR: "#E6E6F0",
    LABEL_COLOR: "#3A3D4A",
    SUBPAGE_CHEVRON_COLOR: "#B5B5C4",
    DANGER_BAND_MESSAGE: "Danger: user settings cannot be changed",
    /** Off boolean switch background; number-slider bar right of the knob (CSS hex). */
    COMPONENT_BG_COLOR: "#DCDCE4",
    /** On boolean switch background; number-slider accent bar left of the knob (CSS hex). */
    COMPONENT_ACCENT_COLOR: "#B1B1FF",
    /** Knob color for boolean switch (on) and number slider (CSS hex). */
    COMPONENT_KNOB_COLOR: "#45454D",
    /** Knob color for boolean switch when off (CSS hex). */
    COMPONENT_BOOLEAN_OFF_KNOB_COLOR: "#8F8F93",
    BOOLEAN_SWITCH_TRACK_WIDTH_PX: 44,
    BOOLEAN_SWITCH_TRACK_HEIGHT_PX: 24,
    BOOLEAN_SWITCH_KNOB_SIZE_PX: 20,
    NUMBER_SLIDER_TRACK_HEIGHT_PX: 6,
    NUMBER_SLIDER_KNOB_SIZE_PX: 20,
    SETTINGS_BACK_BTN_FONT_COLOR: "#B5B5C4",
    /** Interval between schema update requests while schema is out of date (milliseconds). */
    SCHEMA_RETRY_INTERVAL_MS: 5000,
} as const;

export const UserSettings = {
    ...UserSettings0,
    BOTTOM_SCROLL_MARGIN_PX:
        UserSettings0.CLOSE_BTN_SIZE_PX + UserSettings0.CLOSE_BTN_INSET_PX + 12,
    HEADER_SEPARATOR_COLOR: lerpHex(
        UserSettings0.HEADER_TEXT_COLOR,
        UserSettings0.PAGE_BG,
        UserSettings0.HEADER_SEPARATOR_BRIGHTNESS_RATIO,
    ),
};

export const BathroomRemoteDB = {
    READ_RETRY_MS: 2000,
} as const;

export const BathroomMapMarker = {
    SIZE: 50,
    PENDING_IMAGE: "/bathhub_pending_verify_bathroom_map_marker.svg",
    VERIFIED_IMAGE: "/bathhub_verified_bathroom_map_marker.svg",
    COLOR: "#FFF",
    OPACITY: 1.0,
    /**
     * When true, markers **not** loaded from the local cache are tinted 50% darker
     * for debug visualization.
     */
    DEBUG_CACH_LOADED_MARKER: true,
    /** Max camera height (m above ellipsoid) to query and render bathroom markers. */
    MAX_QUERY_CAMERA_HEIGHT_M: 150_000,
    DESTROY_DISTANCE_FROM_VIEWPORT_CENTER: 5000,
} as const;

export const BathroomLocalDB = {
    CACHE_EXPIRATION_SECS: 86400,
    QUERY_DELAY_MS: 500,
} as const;

export const Geolocation = {
    /** Interval between browser geolocation polls for the user position calculator (milliseconds). */
    GEOLOC_UPDATE_POLL_MS: 1_000,
} as const;

export const NearestBathroom = {
    /** Time between every check for if the client's location has changed before rerendering path (milliseconds). */
    PATH_POLL_INTERVAL_MS: 1_000,
    /** Server request timeout when finding the nearest bathroom (milliseconds). */
    FIND_NEAREST_BATHROOM_REQUEST_TIMEOUT_MS: 15_000,
    /** Minimum time between path update checks once debounce has elapsed (milliseconds). */
    BATHROOM_PATH_UPDATE_DEBOUNCE_MS: 3_000,
    /** Minimum client movement before re-requesting path data (meters). */
    BATHROOM_PATH_UPDATE_MIN_DISTANCE_M: 10,
    /** Distance from target bathroom that ends active navigation (meters). */
    BATHROOM_ARRIVAL_DISTANCE_M: 10,
    BATHROOM_REACHED_TARGET_BAND_MESSAGE: "Reached target bathroom",
    /** Server request timeout when updating the active-navigation path (milliseconds). */
    BATHROOM_PATH_UPDATE_REQUEST_TIMEOUT_MS: 15_000,
    BATHROOM_PATH_UPDATE_ERROR_BAND_MESSAGE_ERROR: "Error while updating path",
    BATHROOM_PATH_UPDATE_ERROR_BAND_MESSAGE_TIMEOUT: "Timed out while updating path",
} as const;