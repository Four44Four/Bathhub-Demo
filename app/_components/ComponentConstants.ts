import localFont from "next/font/local";

const NOTOSANS_REGULAR = localFont({ 
    src: "../fonts/NotoSans-Regular.ttf", 
    display: "swap" 
});

const NOTOSANS_BOLD = localFont({ 
    src: "../fonts/NotoSans-Bold.ttf", 
    display: "swap" 
});

const NOTOSANS_LIGHT = localFont({ 
    src: "../fonts/NotoSans-Light.ttf", 
    display: "swap" 
});

export namespace Shared {
    export const FONT_REGULAR_CLASS = NOTOSANS_REGULAR.className;
    export const FONT_BOLD_CLASS = NOTOSANS_BOLD.className;
    export const FONT_LIGHT_CLASS = NOTOSANS_LIGHT.className;
}

export namespace Button {
    export const CORNER_RADIUS = 8;
    export const FILL_COLOR = "#0E0F11";
    export const LINE_COLOR = "#20232D";
    export const LINE_THICKNESS = 1;
    export const TEXT_COLOR = "#AFB4C6";
}

// Public asset path for the clicked-location indicator.
// Default points at `./public/bathhub_logo_no_bg.svg`.
export const CLICKED_INDICATOR_IMAGE = "/bathhub_logo_no_bg.svg";

export namespace Globe {
    export const WATER_COLOR = "#41457E";
    export const LAND_COLOR = "#323255";
    
    export const ZOOM_SENS = 0.01;
    export const ROTATE_MIN = 0.00005;
    export const ZOOM_MIN = 0.00005;
    export const ZOOM_DECAY_FACTOR = 0.5;
    
    // Minimum clearance above the globe surface (meters). Smaller => you can zoom closer.
    export const MIN_SURFACE_CLEARANCE_M = 250;
    
    // Backwards-compatible alias (older code referenced this name).
    export const MIN_CAM_RADIUS_DELTA = MIN_SURFACE_CLEARANCE_M;
}