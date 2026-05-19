/** Max pointer travel (px) still treated as a tap. */
export const TAP_MAX_MOVEMENT_PX = 8;

/** True when pointer movement from down to up is small enough to count as a tap. */
export function isTapGesture(
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
): boolean {
  if (!Number.isFinite(maxMovementPx) || maxMovementPx < 0) return false;
  const dx = Number.isFinite(deltaXPx) ? deltaXPx : 0;
  const dy = Number.isFinite(deltaYPx) ? deltaYPx : 0;
  return Math.hypot(dx, dy) <= maxMovementPx;
}

/** True when the pointer moved enough during the gesture to count as a drag. */
export function pointerCountsAsDrag(
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
): boolean {
  return !isTapGesture(deltaXPx, deltaYPx, maxMovementPx);
}

/** Next drag flag after a pointer move from the down position. */
export function wasDraggingAfterPointerMove(
  wasDragging: boolean,
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
): boolean {
  return wasDragging || pointerCountsAsDrag(deltaXPx, deltaYPx, maxMovementPx);
}

export type Gesture = {
  pointerDown: boolean;
  wasDragging: boolean;
  startXPx: number;
  startYPx: number;
};

export const INITIAL_POINTER_GESTURE: Gesture =
  {
    pointerDown: false,
    wasDragging: false,
    startXPx: 0,
    startYPx: 0,
  };

export function gestureOnDown(
  clientXPx: number,
  clientYPx: number,
): Gesture {
  return {
    pointerDown: true,
    wasDragging: false,
    startXPx: clientXPx,
    startYPx: clientYPx,
  };
}

export function gestureOnMove(
  gesture: Gesture,
  clientXPx: number,
  clientYPx: number,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
): Gesture {
  if (!gesture.pointerDown) return gesture;
  const dx = clientXPx - gesture.startXPx;
  const dy = clientYPx - gesture.startYPx;
  return {
    ...gesture,
    wasDragging: wasDraggingAfterPointerMove(
      gesture.wasDragging,
      dx,
      dy,
      maxMovementPx,
    ),
  };
}

/**
 * On pointer release over the trigger capture layer, trigger when the gesture
 * was a tap (not a drag). Ignores release when `pointerWasDown` is false.
 */
export function hasNonDragTappedHelper(
  pointerWasDown: boolean,
  wasDragging: boolean,
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
): boolean {
  if (!pointerWasDown || wasDragging) return false;
  return isTapGesture(deltaXPx, deltaYPx, maxMovementPx);
}

export function hasNonDragTapped(
  gesture: Gesture,
  clientXPx: number,
  clientYPx: number,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
): boolean {
  const dx = clientXPx - gesture.startXPx;
  const dy = clientYPx - gesture.startYPx;
  return hasNonDragTappedHelper(
    gesture.pointerDown,
    gesture.wasDragging,
    dx,
    dy,
    maxMovementPx,
  );
}

type ListenerTarget = {
  addEventListener: (
    type: string,
    listener: (event: PointerEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener: (
    type: string,
    listener: (event: PointerEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
};

/**
 * Observes pointer gestures on `target` (capture phase).
 * Invokes `onTap` when a tap/click completes; drags do not trigger.
 * When `consumePointerEvent` is true, default actions (including the synthetic
 * `click`) are suppressed for recognized taps.
 */
export function subscribeOnTap(
  onTap: () => void,
  target: ListenerTarget = document,
  maxMovementPx: number = TAP_MAX_MOVEMENT_PX,
  consumePointerEvent = false,
): () => void {
  let gesture = INITIAL_POINTER_GESTURE;
  const captureOpts: AddEventListenerOptions = { capture: true };

  const onPointerDown = (event: PointerEvent) => {
    gesture = gestureOnDown(event.clientX, event.clientY);
  };

  const onPointerMove = (event: PointerEvent) => {
    gesture = gestureOnMove(
      gesture,
      event.clientX,
      event.clientY,
      maxMovementPx,
    );
  };

  const onPointerUp = (event: PointerEvent) => {
    const nonDragTapped = hasNonDragTapped(
      gesture,
      event.clientX,
      event.clientY,
      maxMovementPx,
    );
    gesture = INITIAL_POINTER_GESTURE;
    if (!nonDragTapped) return;
    if (consumePointerEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
    onTap();
  };

  target.addEventListener("pointerdown", onPointerDown, captureOpts);
  target.addEventListener("pointermove", onPointerMove, captureOpts);
  target.addEventListener("pointerup", onPointerUp, captureOpts);
  target.addEventListener("pointercancel", onPointerUp, captureOpts);

  return () => {
    target.removeEventListener("pointerdown", onPointerDown, captureOpts);
    target.removeEventListener("pointermove", onPointerMove, captureOpts);
    target.removeEventListener("pointerup", onPointerUp, captureOpts);
    target.removeEventListener("pointercancel", onPointerUp, captureOpts);
  };
}
