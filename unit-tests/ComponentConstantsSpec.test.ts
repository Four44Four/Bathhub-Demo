import {
  AddBathroom,
  Alerts,
  BathroomLocalDB,
  BathroomMapMarker,
  BathroomPage,
  BathroomRemoteDB,
  DebugCrosshair,
  DropdownMenu,
  Geolocation,
  Globe,
  LoadingSpinner,
  Menus,
  NearestBathroom,
  Path,
  Shared,
  SwipeMenu,
  SwipeUpMainMenuButton,
  UserSettings,
  Viewport2dButton,
} from "../app/_client/ComponentConstants";

describe("component constants match their specifications", () => {
  test("viewport2d button defaults match viewport2d_button.md", () => {
    expect(Viewport2dButton).toMatchObject({
      ANIMATION_DURATION_MS: 250,
      HOVER_INTERACT_DARKENING_MULT_FACTOR: 0.7,
      CORNER_RADIUS: 8,
      FILL_COLOR: "#0E0F11",
      OUTLINE_COLOR: "#20232D",
      OUTLINE_THICKNESS: 1,
      TEXT: null,
      PADDING: 0,
      WIDTH_OVERRIDE: null,
      IMAGE: null,
      IMAGE_LEFT_OF_TEXT: true,
      IMAGE_TEXT_GAP: 0,
      IMAGE_SIZE: 24,
      CIRCULAR: false,
      HOVER_INTERACT_BEHAVIOR: "invert",
      ANCHOR_ELEMENT: null,
      DROP_SHADOW: null,
    });
  });

  test("dropdown and loading spinner constants match component specs", () => {
    expect(DropdownMenu).toMatchObject({
      ANIMATION_DURATION_MS: 250,
      HOVER_INTERACT_DARKENING_MULT_FACTOR: 0.7,
      ARROW_ICON_PIXEL_SIZE: 24,
      PADDING_PIXEL_SIZE: 10,
      ARROW_ICON_COLOR: "#B5B5C4",
      FILL_COLOR: "#ffffff",
      CORNER_RADIUS: 8,
      OUTLINE_COLOR: "#E4E4FF",
      OUTLINE_THICKNESS: 1,
      WIDTH_OVERRIDE: null,
      DROP_SHADOW: null,
      HOVER_INTERACT_BEHAVIOR: "darken",
      ANCHOR_ELEMENT: null,
      SUBCOMPONENTS_LIST: null,
    });
    expect(LoadingSpinner).toEqual({
      CYCLE_DURATION_MS: 800,
      THICKNESS_PX: 3,
    });
  });

  test("swipe-up menu and main-menu button constants match their specs", () => {
    expect(SwipeMenu).toMatchObject({
      MAX_EXPAND_RATIO: 0.9,
      EXPAND_SNAP_THRESHOLD_RATIO: 0.35,
      MOVE_ANIMATION_DURATION_MS: 200,
      BG_COLOR: "#FFFFFF",
      PULL_HANDLE_BG_COLOR: "#888888",
      PULL_HANDLE_WIDTH_RATIO: 0.18,
      PULL_HANDLE_HEIGHT_PX: 4,
      TOP_CORNER_RADIUS_PX: 12,
    });
    expect(SwipeUpMainMenuButton).toMatchObject({
      FILL_COLOR: "#ffffff",
      TEXT_COLOR: "#B5B5C4",
      TEXT_FONT_SIZE: 10,
      CORNER_RADIUS_PX: 15,
      ANIMATION_DURATION_MS: 250,
      HOVER_INTERACT_DARKENING_MULT_FACTOR: 0.85,
      PADDING_VERTICAL_PX: 10,
      PADDING_HORIZONTAL_PX: 10,
      TEXT_MARGIN_PX: 10,
      DEFAULT_MIN_HEIGHT: "0px",
    });
  });

  test("bathroom-page and alert constants match their specs", () => {
    expect(BathroomPage).toMatchObject({
      NON_VERIFIED_COLOR: "#DCA36E",
      VERIFIED_COLOR: "#6EDCB9",
      COMPONENTS_GAP_PX: 10,
      TEXT_COLOR: "#B5B5C4",
      BUTTON_FILL_COLOR: "#ffffff",
      STAR_RATING_5_FILL_COLOR: "#F0E1A0",
      STAR_RATING_4_FILL_COLOR: "#F0CFA0",
      STAR_RATING_3_FILL_COLOR: "#F0C2A0",
      STAR_RATING_2_FILL_COLOR: "#F0AFA0",
      STAR_RATING_1_FILL_COLOR: "#F0A0A0",
      STAR_RATING_UNFILL_COLOR: "#E4E4FF",
      RATINGS_PANEL_BUFFER_HEIGHT_PX: 10,
      RATINGS_PANEL_AVERAGE_AND_STARS_GAP_PX: 5,
      LOADING_SPINNER_ACCENT_COLOR: "#B5B5C4",
      LOADING_SPINNER_BASE_COLOR: "rgba(181, 181, 196, 0.35)",
      LOADING_SPINNER_RADIUS_PX: 20,
      BUTTON_LOADING_SPINNER_RADIUS_PX: 9,
    });
    expect(Alerts).toMatchObject({
      NEGATIVE_ACCENT_COLOR: "#EC3968",
      POSITIVE_ACCENT_COLOR: "#7BE3C7",
      BAND_ALERT_AUTO_HIDE_MS: 3_000,
    });
  });

  test("viewport, add-bathroom, and background constants match their specs", () => {
    expect(DebugCrosshair).toMatchObject({
      BASE_COLOR: "#FF0000",
      SECONDARY_COLOR: "#FF9696",
      FADE_OUT_MS: 1_000,
      BLEND_OUT_COLORS_MS: 500,
    });
    expect(Shared).toMatchObject({
      POSITIVE_COLOR: "#6CE0D1",
      NEGATIVE_COLOR: "#E06C89",
      ICON_ON_TINTED_BUTTON_COLOR: "#ffffff",
    });
    expect(AddBathroom).toMatchObject({
      ACTION_BUTTON_SIDE_MARGIN_PX: 12,
      ACTION_BUTTON_GAP_PX: 8,
      ACTION_BUTTON_BOTTOM_MARGIN_PX: 16,
      LOADING_SPINNER_RADIUS_PX: 20,
      LOADING_SPINNER_ACCENT_COLOR: "#ffffff",
      LOADING_SPINNER_BASE_COLOR: "rgba(255, 255, 255, 0.22)",
      REQUEST_TIMEOUT_MS: 15_000,
    });
    expect(Menus.BACKDROP_COLOR).toBe("rgba(0, 0, 0, 0.62)");
  });

  test("bathroom-reading and geolocation constants match their specs", () => {
    expect(Globe.MIN_SURFACE_CLEARANCE_M).toBe(250);
    expect(BathroomMapMarker.MAX_QUERY_CAMERA_HEIGHT_M).toBe(150_000);
    expect(BathroomMapMarker.DESTROY_DISTANCE_FROM_VIEWPORT_CENTER).toBe(
      150_000,
    );
    expect(BathroomRemoteDB.READ_RETRY_MS).toBe(2_000);
    expect(BathroomLocalDB.QUERY_DELAY_MS).toBe(500);
    expect(BathroomLocalDB.CACHE_EXPIRATION_SECS).toBe(86_400);
    expect(Geolocation.GEOLOC_UPDATE_POLL_MS).toBe(1_000);
  });

  test("find-nearest and user-settings constants match their specs", () => {
    expect(NearestBathroom).toMatchObject({
      PATH_POLL_INTERVAL_MS: 1_000,
      FIND_NEAREST_BATHROOM_REQUEST_TIMEOUT_MS: 15_000,
      BATHROOM_PATH_UPDATE_DEBOUNCE_MS: 3_000,
      BATHROOM_PATH_UPDATE_MIN_DISTANCE_M: 10,
      BATHROOM_ARRIVAL_DISTANCE_M: 10,
      BATHROOM_PATH_UPDATE_REQUEST_TIMEOUT_MS: 15_000,
    });
    expect(Path).toMatchObject({
      MIN_VERTEX_SEPARATION_PIXELS: 10,
      PATH_REBUILD_LOD_GEOM_DEBOUNCE_MS: 500,
      GRADIENT_ROLL_PERIOD_MS: 1_000,
      GRADIENT_ROLL_MAX_FPS: 30,
    });
    expect(UserSettings).toMatchObject({
      ROW_HOVER_BRIGHTNESS_FACTOR: 0.9,
      ROW_HOVER_TRANSITION_MS: 200,
      BOOLEAN_TOGGLE_ANIMATE_DURATION_MS: 150,
      SCHEMA_RETRY_INTERVAL_MS: 5_000,
      DANGER_BAND_MESSAGE: "Danger: user settings cannot be changed",
      BOTTOM_BUTTON_GAP_PX: 10,
      BOTTOM_BUTTON_CORNER_RADIUS_PX: 15,
    });
  });
});
