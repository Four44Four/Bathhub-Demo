import {
  INITIAL_POINTER_GESTURE,
  TAP_MAX_MOVEMENT_PX,
  isTapGesture,
  pointerCountsAsDrag,
  gestureOnDown,
  gestureOnMove,
  hasNonDragTapped,
  hasNonDragTappedHelper,
  wasDraggingAfterPointerMove,
  subscribeOnTap,
} from "../app/_client/NonDragTapDetector";

describe("NonDragTapDetector", () => {
  test("isTapGesture", () => {
    expect(isTapGesture(0, 0)).toBe(true);
    expect(isTapGesture(8, 0)).toBe(true);
    expect(isTapGesture(0, 8)).toBe(true);
    expect(isTapGesture(5, 5)).toBe(true);
    expect(isTapGesture(9, 0)).toBe(false);
    expect(isTapGesture(0, -9)).toBe(false);
  });

  test("pointerCountsAsDrag", () => {
    expect(pointerCountsAsDrag(0, 0)).toBe(false);
    expect(pointerCountsAsDrag(20, 0)).toBe(true);
  });

  test("wasDraggingAfterPointerMove", () => {
    expect(wasDraggingAfterPointerMove(false, 0, 0)).toBe(false);
    expect(wasDraggingAfterPointerMove(false, 12, 0)).toBe(true);
    expect(wasDraggingAfterPointerMove(true, 0, 0)).toBe(true);
  });

  test("hasNonDragTappedHelper dismisses taps only", () => {
    expect(
      hasNonDragTappedHelper(true, false, 0, 0),
    ).toBe(true);
    expect(
      hasNonDragTappedHelper(true, true, 0, 0),
    ).toBe(false);
    expect(
      hasNonDragTappedHelper(true, false, 20, 0),
    ).toBe(false);
    expect(
      hasNonDragTappedHelper(false, false, 0, 0),
    ).toBe(false);
  });

  test("TAP_MAX_MOVEMENT_PX default", () => {
    expect(TAP_MAX_MOVEMENT_PX).toBe(8);
  });

  test("Gesture tracks tap vs drag", () => {
    let gesture = INITIAL_POINTER_GESTURE;
    gesture = gestureOnDown(10, 20);
    expect(hasNonDragTapped(gesture, 10, 20)).toBe(true);

    gesture = gestureOnMove(gesture, 30, 20);
    expect(hasNonDragTapped(gesture, 30, 20)).toBe(false);
  });

  test("subscribeOnTap runs on taps only", () => {
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

    let triggerCount = 0;
    const unsubscribe = subscribeOnTap(
      () => {
        triggerCount += 1;
      },
      target,
    );

    expect(listeners.get("pointerdown")?.options).toEqual({ capture: true });

    const down = listeners.get("pointerdown")!.listener;
    const move = listeners.get("pointermove")!.listener;
    const up = listeners.get("pointerup")!.listener;

    down({ clientX: 0, clientY: 0 } as PointerEvent);
    up({ clientX: 0, clientY: 0 } as PointerEvent);
    expect(triggerCount).toBe(1);

    down({ clientX: 0, clientY: 0 } as PointerEvent);
    move({ clientX: 40, clientY: 0 } as PointerEvent);
    up({ clientX: 40, clientY: 0 } as PointerEvent);
    expect(triggerCount).toBe(1);

    unsubscribe();
    expect(listeners.size).toBe(0);
    expect(triggerCount).toBe(1);
  });

  test("subscribeOnTap can consume pointer events on tap", () => {
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
      removeEventListener: () => {},
    };

    subscribeOnTap(() => {}, target, TAP_MAX_MOVEMENT_PX, true);

    const down = listeners.get("pointerdown")!.listener;
    const up = listeners.get("pointerup")!.listener;
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();

    down({ clientX: 0, clientY: 0 } as PointerEvent);
    up({
      clientX: 0,
      clientY: 0,
      preventDefault,
      stopPropagation,
    } as unknown as PointerEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });
});
