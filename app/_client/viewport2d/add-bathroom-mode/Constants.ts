import { MapMarker as MapMarkerConsts } from "../../ComponentConstants";

/** CSS pixel height of the cancel (X) and confirm (✓) action buttons. */
export const ADD_BATHROOM_ACTION_BUTTON_HEIGHT_PX = 50;
/** Screen-space height of the cancel/confirm icon images. */
export const ADD_BATHROOM_ACTION_ICON_SIZE_PX = 22;
export const ADD_BATHROOM_CANCEL_ICON = "/cross.svg";
export const ADD_BATHROOM_CONFIRM_ICON = "/checkmark.svg";

export const ADD_BATHROOM_ACTION_BUTTON_SIDE_MARGIN_PX = 12;
export const ADD_BATHROOM_ACTION_BUTTON_GAP_PX = 8;
export const ADD_BATHROOM_ACTION_BUTTON_BOTTOM_MARGIN_PX = 16;

export const ADD_BATHROOM_MARKER_SIZE_PX = MapMarkerConsts.SIZE;
export const ADD_BATHROOM_MARKER_IMAGE = "/bathhub_add_new_map_marker.svg";
export const ADD_BATHROOM_MARKER_OPACITY = MapMarkerConsts.OPACITY;

/** Spinner diameter in CSS pixels while a create request is in flight. */
export const ADD_BATHROOM_LOADING_SPINNER_SIZE_PX = 40;

/** Server create request timeout per add-bathroom spec (milliseconds). */
export const ADD_BATHROOM_REQUEST_TIMEOUT_MS = 15_000;
