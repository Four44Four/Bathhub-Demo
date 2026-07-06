import { createUserGeolocationTracker } from "../app/_client/geolocation/UserGeolocationTracker";

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("createUserGeolocationTracker", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("polls on start when permission is granted and notifies user position", async () => {
    const onUserPositionChange = jest.fn();
    const pollPosition = jest
      .fn()
      .mockResolvedValueOnce({
        latitude: 40.7,
        longitude: -74.0,
        accuracyMeters: 30,
      })
      .mockResolvedValue({
        latitude: 40.71,
        longitude: -74.01,
        accuracyMeters: 30,
      });

    const tracker = createUserGeolocationTracker({
      pollIntervalMs: 50,
      pollPosition,
      readPermissionState: async () => "granted",
      listeners: { onUserPositionChange },
    });

    tracker.start();
    await flushPromises();

    expect(onUserPositionChange).toHaveBeenCalledWith({
      latitude: 40.7,
      longitude: -74.0,
    });
    expect(tracker.getUserGeoPosition()).toEqual({
      latitude: 40.7,
      longitude: -74.0,
    });

    tracker.stop();
  });

  test("revokes access when permission is denied", async () => {
    const onPermissionGrantedChange = jest.fn();
    const tracker = createUserGeolocationTracker({
      pollPosition: async () => ({
        latitude: 1,
        longitude: 2,
        accuracyMeters: 10,
      }),
      readPermissionState: async () => "denied",
      listeners: { onPermissionGrantedChange },
    });

    tracker.start();
    await flushPromises();

    expect(onPermissionGrantedChange).toHaveBeenCalledWith(false);
    expect(tracker.getUserGeoPosition()).toBeNull();

    tracker.stop();
  });

  test("seedUserPosition updates confirmed position immediately", () => {
    const onUserPositionChange = jest.fn();
    const tracker = createUserGeolocationTracker({
      listeners: { onUserPositionChange },
      readPermissionState: async () => "denied",
    });

    tracker.seedUserPosition({ latitude: 5, longitude: 6 }, 0);

    expect(tracker.getUserGeoPosition()).toEqual({ latitude: 5, longitude: 6 });
    expect(onUserPositionChange).toHaveBeenCalledWith({ latitude: 5, longitude: 6 });
  });

  test("prompts for permission and grants access on successful initial poll", async () => {
    const onUserPositionChange = jest.fn();
    const onPermissionGrantedChange = jest.fn();
    const pollPosition = jest.fn().mockResolvedValue({
      latitude: 40.7,
      longitude: -74.0,
      accuracyMeters: 30,
    });

    const tracker = createUserGeolocationTracker({
      pollPosition,
      readPermissionState: async () => "prompt",
      listeners: { onUserPositionChange, onPermissionGrantedChange },
    });

    tracker.start();
    await flushPromises();

    expect(pollPosition).toHaveBeenCalled();
    expect(onUserPositionChange).toHaveBeenCalledWith({
      latitude: 40.7,
      longitude: -74.0,
    });
    expect(onPermissionGrantedChange).toHaveBeenCalledWith(true);
    expect(tracker.isPermissionGranted()).toBe(true);

    tracker.stop();
  });

  test("null poll does not crash or notify spuriously", async () => {
    const onUserPositionChange = jest.fn();
    const onPermissionGrantedChange = jest.fn();
    const pollPosition = jest.fn().mockResolvedValue(null);

    const tracker = createUserGeolocationTracker({
      pollPosition,
      readPermissionState: async () => "granted",
      listeners: { onUserPositionChange, onPermissionGrantedChange },
    });

    tracker.start();
    await flushPromises();

    expect(tracker.getUserGeoPosition()).toBeNull();
    expect(onUserPositionChange).not.toHaveBeenCalled();
    expect(onPermissionGrantedChange).toHaveBeenCalledWith(true);

    tracker.stop();
  });

  test("periodic poll keeps user position when within accuracy radius", async () => {
    jest.useFakeTimers();
    const onUserPositionChange = jest.fn();
    const pollPosition = jest
      .fn()
      .mockResolvedValueOnce({ latitude: 10, longitude: 20, accuracyMeters: 50 })
      .mockResolvedValueOnce({ latitude: 10.00001, longitude: 20.00001, accuracyMeters: 100 });

    const tracker = createUserGeolocationTracker({
      pollIntervalMs: 1000,
      pollPosition,
      readPermissionState: async () => "granted",
      listeners: { onUserPositionChange },
    });

    tracker.start();
    await flushPromises();

    expect(tracker.getUserGeoPosition()).toEqual({ latitude: 10, longitude: 20 });
    onUserPositionChange.mockClear();

    await jest.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(tracker.getUserGeoPosition()).toEqual({ latitude: 10, longitude: 20 });
    expect(onUserPositionChange).not.toHaveBeenCalled();

    tracker.stop();
  });

  test("periodic poll updates user position when outside accuracy radius", async () => {
    jest.useFakeTimers();
    const onUserPositionChange = jest.fn();
    const pollPosition = jest
      .fn()
      .mockResolvedValueOnce({ latitude: 10, longitude: 20, accuracyMeters: 10 })
      .mockResolvedValueOnce({ latitude: 10.01, longitude: 20.01, accuracyMeters: 10 });

    const tracker = createUserGeolocationTracker({
      pollIntervalMs: 1000,
      pollPosition,
      readPermissionState: async () => "granted",
      listeners: { onUserPositionChange },
    });

    tracker.start();
    await flushPromises();

    onUserPositionChange.mockClear();

    await jest.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(tracker.getUserGeoPosition()).toEqual({ latitude: 10.01, longitude: 20.01 });
    expect(onUserPositionChange).toHaveBeenCalledWith({ latitude: 10.01, longitude: 20.01 });

    tracker.stop();
  });

  test("stop clears poll interval so no further polls fire", async () => {
    jest.useFakeTimers();
    const pollPosition = jest.fn().mockResolvedValue({
      latitude: 1,
      longitude: 2,
      accuracyMeters: 10,
    });

    const tracker = createUserGeolocationTracker({
      pollIntervalMs: 1000,
      pollPosition,
      readPermissionState: async () => "granted",
    });

    tracker.start();
    await flushPromises();

    const callsAfterStart = pollPosition.mock.calls.length;
    tracker.stop();

    await jest.advanceTimersByTimeAsync(5000);
    await flushPromises();

    expect(pollPosition.mock.calls.length).toBe(callsAfterStart);
  });

  describe("permission change listener", () => {
    const originalPermissions = navigator.permissions;
    let changeHandler: (() => void) | null = null;
    let mockStatus: { state: PermissionState; addEventListener: jest.Mock; removeEventListener: jest.Mock };

    beforeEach(() => {
      changeHandler = null;
      mockStatus = {
        state: "prompt",
        addEventListener: jest.fn((event: string, handler: () => void) => {
          if (event === "change") changeHandler = handler;
        }),
        removeEventListener: jest.fn(),
      };
      Object.defineProperty(navigator, "permissions", {
        value: {
          query: jest.fn().mockResolvedValue(mockStatus),
        },
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, "permissions", {
        value: originalPermissions,
        configurable: true,
      });
    });

    test("grants access when permission changes to granted after start", async () => {
      const onPermissionGrantedChange = jest.fn();
      const pollPosition = jest.fn().mockResolvedValue({
        latitude: 1,
        longitude: 2,
        accuracyMeters: 10,
      });

      const tracker = createUserGeolocationTracker({
        pollPosition,
        readPermissionState: async () => "prompt",
        listeners: { onPermissionGrantedChange },
      });

      tracker.start();
      await flushPromises();

      onPermissionGrantedChange.mockClear();
      mockStatus.state = "granted";
      changeHandler?.();
      await flushPromises();

      expect(onPermissionGrantedChange).toHaveBeenCalledWith(true);
      expect(tracker.isPermissionGranted()).toBe(true);
      expect(tracker.getUserGeoPosition()).toEqual({ latitude: 1, longitude: 2 });

      tracker.stop();
    });

    test("revokes access and clears position when permission changes to denied", async () => {
      mockStatus.state = "granted";
      const onPermissionGrantedChange = jest.fn();
      const onUserPositionChange = jest.fn();
      const pollPosition = jest.fn().mockResolvedValue({
        latitude: 1,
        longitude: 2,
        accuracyMeters: 10,
      });

      const tracker = createUserGeolocationTracker({
        pollPosition,
        readPermissionState: async () => "granted",
        listeners: { onPermissionGrantedChange, onUserPositionChange },
      });

      tracker.start();
      await flushPromises();

      expect(tracker.getUserGeoPosition()).not.toBeNull();

      onPermissionGrantedChange.mockClear();
      onUserPositionChange.mockClear();
      mockStatus.state = "denied";
      changeHandler?.();

      expect(tracker.getUserGeoPosition()).toBeNull();
      expect(tracker.isPermissionGranted()).toBe(false);
      expect(onPermissionGrantedChange).toHaveBeenCalledWith(false);
      expect(onUserPositionChange).toHaveBeenCalledWith(null);

      tracker.stop();
    });
  });
});
