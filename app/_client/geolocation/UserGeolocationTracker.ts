import { Geolocation as GeolocationConsts } from "../ComponentConstants";
import {
  applyInitialGeolocationFixToCalculatorState,
  applyPeriodicGeolocationPollToCalculatorState,
  createInitialUserGeolocationCalculatorState,
  seedUserGeolocationCalculatorState,
  type GeoLatLon,
  type UserGeolocationCalculatorState,
} from "../pure/globe/UserGeolocationCalculator";
import {
  readGeolocationPermissionState,
  type GeolocationPermissionState,
} from "../pure/globe/ClientGeolocationAccess";

export type PolledGeolocationFix = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

export type UserGeolocationTrackerListeners = {
  onUserPositionChange?: (position: GeoLatLon | null) => void;
  onPermissionGrantedChange?: (granted: boolean) => void;
};

export type PollGeolocationPosition = () => Promise<PolledGeolocationFix | null>;

export type UserGeolocationTracker = {
  getState: () => UserGeolocationCalculatorState;
  getUserGeoPosition: () => GeoLatLon | null;
  isPermissionGranted: () => boolean;
  seedUserPosition: (position: GeoLatLon, accuracyMeters?: number) => void;
  start: () => void;
  stop: () => void;
};

export type CreateUserGeolocationTrackerArgs = {
  pollIntervalMs?: number;
  pollPosition?: PollGeolocationPosition;
  readPermissionState?: () => Promise<GeolocationPermissionState>;
  listeners?: UserGeolocationTrackerListeners;
};

const DEFAULT_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
};

export function createBrowserPollGeolocationPosition(
  geoOptions: PositionOptions = DEFAULT_GEO_OPTIONS,
): PollGeolocationPosition {
  return () =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
          });
        },
        () => resolve(null),
        geoOptions,
      );
    });
}

export function createUserGeolocationTracker(
  args: CreateUserGeolocationTrackerArgs = {},
): UserGeolocationTracker {
  const pollIntervalMs = args.pollIntervalMs ?? GeolocationConsts.GEOLOC_UPDATE_POLL_MS;
  const pollPosition = args.pollPosition ?? createBrowserPollGeolocationPosition();
  const readPermissionState = args.readPermissionState ?? readGeolocationPermissionState;
  const listeners = args.listeners ?? {};

  let state = createInitialUserGeolocationCalculatorState();
  let permissionGranted = false;
  let started = false;
  let cancelled = false;
  let pollTimerId: ReturnType<typeof setInterval> | null = null;
  let permStatus: PermissionStatus | null = null;
  let onPermChange: (() => void) | null = null;
  let pollInFlight = false;

  const notifyUserPosition = () => {
    listeners.onUserPositionChange?.(state.userGeoPosition);
  };

  const notifyPermissionGranted = (granted: boolean) => {
    permissionGranted = granted;
    listeners.onPermissionGrantedChange?.(granted);
  };

  const clearPollTimer = () => {
    if (pollTimerId !== null) {
      clearInterval(pollTimerId);
      pollTimerId = null;
    }
  };

  const applyInitialFix = (fix: PolledGeolocationFix) => {
    state = applyInitialGeolocationFixToCalculatorState(
      state,
      { latitude: fix.latitude, longitude: fix.longitude },
      fix.accuracyMeters,
    );
    notifyUserPosition();
  };

  const applyPeriodicFix = (fix: PolledGeolocationFix) => {
    const prevUser = state.userGeoPosition;
    state = applyPeriodicGeolocationPollToCalculatorState(
      state,
      { latitude: fix.latitude, longitude: fix.longitude },
      fix.accuracyMeters,
    );
    if (
      prevUser?.latitude !== state.userGeoPosition?.latitude ||
      prevUser?.longitude !== state.userGeoPosition?.longitude
    ) {
      notifyUserPosition();
    }
  };

  const pollOnce = async (
    mode: "initial" | "periodic",
    options?: { ignorePermissionGate?: boolean },
  ) => {
    if (cancelled || pollInFlight || (!permissionGranted && !options?.ignorePermissionGate)) {
      return;
    }
    pollInFlight = true;
    try {
      const fix = await pollPosition();
      if (cancelled || !fix) return;
      if (mode === "initial") {
        applyInitialFix(fix);
      } else {
        applyPeriodicFix(fix);
      }
    } finally {
      pollInFlight = false;
    }
  };

  const startPolling = () => {
    clearPollTimer();
    if (!permissionGranted || cancelled) return;
    void pollOnce("initial");
    pollTimerId = setInterval(() => {
      void pollOnce("periodic");
    }, pollIntervalMs);
  };

  const stopPolling = () => {
    clearPollTimer();
  };

  const revokeAccess = () => {
    stopPolling();
    state = createInitialUserGeolocationCalculatorState();
    notifyPermissionGranted(false);
    notifyUserPosition();
  };

  const grantAccess = () => {
    // Publish any fix already in calculator state before flipping permission so
    // consumers never observe granted-without-coordinates.
    if (state.userGeoPosition) {
      notifyUserPosition();
    }
    notifyPermissionGranted(true);
    startPolling();
  };

  const syncPermission = async () => {
    const permissionState = await readPermissionState();
    if (cancelled) return;
    if (permissionState === "granted") {
      grantAccess();
      return;
    }
    if (permissionState === "denied") {
      revokeAccess();
      return;
    }
    if (permissionState === "unknown") {
      // Permissions API unavailable (e.g. Safari) — poll immediately.
      grantAccess();
      return;
    }
    // "prompt": trigger the browser permission dialog; polling starts on grant.
    void pollOnce("initial", { ignorePermissionGate: true }).then(() => {
      if (cancelled) return;
      if (state.userGeoPosition) {
        grantAccess();
      }
    });
  };

  const attachPermissionListener = async () => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (cancelled) return;
      permStatus = status;
      onPermChange = () => {
        if (cancelled) return;
        if (status.state === "granted") {
          grantAccess();
          return;
        }
        if (status.state === "denied") {
          revokeAccess();
          return;
        }
        notifyPermissionGranted(false);
        stopPolling();
      };
      status.addEventListener("change", onPermChange);
    } catch {
      // Permissions API unavailable — rely on successful polls.
    }
  };

  const detachPermissionListener = () => {
    if (permStatus && onPermChange) {
      permStatus.removeEventListener("change", onPermChange);
    }
    permStatus = null;
    onPermChange = null;
  };

  return {
    getState: () => state,
    getUserGeoPosition: () => state.userGeoPosition,
    isPermissionGranted: () => permissionGranted,
    seedUserPosition: (position, accuracyMeters = 0) => {
      state = seedUserGeolocationCalculatorState(state, position, accuracyMeters);
      notifyUserPosition();
    },
    start: () => {
      if (started) return;
      started = true;
      cancelled = false;
      void syncPermission().then(() => {
        if (!cancelled) void attachPermissionListener();
      });
    },
    stop: () => {
      cancelled = true;
      started = false;
      stopPolling();
      detachPermissionListener();
    },
  };
}
