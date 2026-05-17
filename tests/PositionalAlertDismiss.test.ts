import {
  INITIAL_POSITIONAL_ALERT_POINTER_GESTURE,
  POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
  positionalAlertIsTapGesture,
  positionalAlertPointerCountsAsDrag,
  positionalAlertPointerGestureOnDown,
  positionalAlertPointerGestureOnMove,
  positionalAlertShouldDismissGesture,
  positionalAlertShouldDismissOnPointerUp,
  positionalAlertWasDraggingAfterPointerMove,
  subscribePositionalAlertDismissOnTap,
} from "../app/_client/pure/PositionalAlertDismiss";

describe("PositionalAlertDismiss", () => {
  test("positionalAlertIsTapGesture", () => {
    expect(positionalAlertIsTapGesture(0, 0)).toBe(true);
    expect(positionalAlertIsTapGesture(8, 0)).toBe(true);
    expect(positionalAlertIsTapGesture(0, 8)).toBe(true);
    expect(positionalAlertIsTapGesture(5, 5)).toBe(true);
    expect(positionalAlertIsTapGesture(9, 0)).toBe(false);
    expect(positionalAlertIsTapGesture(0, -9)).toBe(false);
  });

  test("positionalAlertPointerCountsAsDrag", () => {
    expect(positionalAlertPointerCountsAsDrag(0, 0)).toBe(false);
    expect(positionalAlertPointerCountsAsDrag(20, 0)).toBe(true);
  });

  test("positionalAlertWasDraggingAfterPointerMove", () => {
    expect(positionalAlertWasDraggingAfterPointerMove(false, 0, 0)).toBe(false);
    expect(positionalAlertWasDraggingAfterPointerMove(false, 12, 0)).toBe(true);
    expect(positionalAlertWasDraggingAfterPointerMove(true, 0, 0)).toBe(true);
  });

  test("positionalAlertShouldDismissOnPointerUp dismisses taps only", () => {
    expect(
      positionalAlertShouldDismissOnPointerUp(true, false, 0, 0),
    ).toBe(true);
    expect(
      positionalAlertShouldDismissOnPointerUp(true, true, 0, 0),
    ).toBe(false);
    expect(
      positionalAlertShouldDismissOnPointerUp(true, false, 20, 0),
    ).toBe(false);
    expect(
      positionalAlertShouldDismissOnPointerUp(false, false, 0, 0),
    ).toBe(false);
  });

  test("POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX default", () => {
    expect(POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX).toBe(8);
  });

  test("positionalAlertPointerGesture tracks tap vs drag", () => {
    let gesture = INITIAL_POSITIONAL_ALERT_POINTER_GESTURE;
    gesture = positionalAlertPointerGestureOnDown(10, 20);
    expect(positionalAlertShouldDismissGesture(gesture, 10, 20)).toBe(true);

    gesture = positionalAlertPointerGestureOnMove(gesture, 30, 20);
    expect(positionalAlertShouldDismissGesture(gesture, 30, 20)).toBe(false);
  });

  test("subscribePositionalAlertDismissOnTap dismisses taps only", () => {
    const listeners = new Map<
      string,
      { listener: (event: PointerEvent) => void; options?: AddEventListenerOptions }
    >();
    const target = {
      addEventListener: (
        type: string,
        listener: (event: PointerEvent) => void,
        options?: boolean | AddEventListenerOptions,
      ) => {
        listeners.set(type, {
          listener,
          options: typeof options === "object" ? options : undefined,
        });
      },
      removeEventListener: (
        type: string,
        listener: (event: PointerEvent) => void,
      ) => {
        const entry = listeners.get(type);
        if (entry?.listener === listener) listeners.delete(type);
      },
    };

    let dismissCount = 0;
    const unsubscribe = subscribePositionalAlertDismissOnTap(
      () => {
        dismissCount += 1;
      },
      target,
    );

    expect(listeners.get("pointerdown")?.options).toEqual({ capture: true });

    const down = listeners.get("pointerdown")!.listener;
    const move = listeners.get("pointermove")!.listener;
    const up = listeners.get("pointerup")!.listener;

    down({ clientX: 0, clientY: 0 } as PointerEvent);
    up({ clientX: 0, clientY: 0 } as PointerEvent);
    expect(dismissCount).toBe(1);

    down({ clientX: 0, clientY: 0 } as PointerEvent);
    move({ clientX: 40, clientY: 0 } as PointerEvent);
    up({ clientX: 40, clientY: 0 } as PointerEvent);
    expect(dismissCount).toBe(1);

    unsubscribe();
    expect(listeners.size).toBe(0);
    expect(dismissCount).toBe(1);
  });
});
