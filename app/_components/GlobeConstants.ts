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