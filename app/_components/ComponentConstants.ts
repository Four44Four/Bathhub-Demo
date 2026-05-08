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

export const Shared = {
    FONT_REGULAR_CLASS: NOTOSANS_REGULAR.className,
    FONT_BOLD_CLASS: NOTOSANS_BOLD.className,
    FONT_LIGHT_CLASS: NOTOSANS_LIGHT.className,
} as const;

export const Button = {
    CORNER_RADIUS: 8,
    FILL_COLOR: "#0E0F11",
    LINE_COLOR: "#20232D",
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
} as const;