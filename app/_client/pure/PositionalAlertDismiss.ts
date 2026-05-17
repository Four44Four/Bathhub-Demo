/** Max pointer travel (px) still treated as a tap for dismissing a positional alert. */
export const POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX = 8;

/** True when pointer movement from down to up is small enough to count as a tap. */
export function positionalAlertIsTapGesture(
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): boolean {
  if (!Number.isFinite(maxMovementPx) || maxMovementPx < 0) return false;
  const dx = Number.isFinite(deltaXPx) ? deltaXPx : 0;
  const dy = Number.isFinite(deltaYPx) ? deltaYPx : 0;
  return Math.hypot(dx, dy) <= maxMovementPx;
}

/** True when the pointer moved enough during the gesture to count as a drag. */
export function positionalAlertPointerCountsAsDrag(
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): boolean {
  return !positionalAlertIsTapGesture(deltaXPx, deltaYPx, maxMovementPx);
}

/**
 * On pointer release over the dismiss capture layer, dismiss when the gesture
 * was a tap (not a drag). Ignores release when `pointerWasDown` is false.
 */
export function positionalAlertShouldDismissOnPointerUp(
  pointerWasDown: boolean,
  wasDragging: boolean,
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): boolean {
  if (!pointerWasDown || wasDragging) return false;
  return positionalAlertIsTapGesture(deltaXPx, deltaYPx, maxMovementPx);
}

/** Next drag flag after a pointer move from the down position. */
export function positionalAlertWasDraggingAfterPointerMove(
  wasDragging: boolean,
  deltaXPx: number,
  deltaYPx: number,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): boolean {
  return wasDragging || positionalAlertPointerCountsAsDrag(deltaXPx, deltaYPx, maxMovementPx);
}

export type PositionalAlertPointerGesture = {
  pointerDown: boolean;
  wasDragging: boolean;
  startXPx: number;
  startYPx: number;
};

export const INITIAL_POSITIONAL_ALERT_POINTER_GESTURE: PositionalAlertPointerGesture =
  {
    pointerDown: false,
    wasDragging: false,
    startXPx: 0,
    startYPx: 0,
  };

export function positionalAlertPointerGestureOnDown(
  clientXPx: number,
  clientYPx: number,
): PositionalAlertPointerGesture {
  return {
    pointerDown: true,
    wasDragging: false,
    startXPx: clientXPx,
    startYPx: clientYPx,
  };
}

export function positionalAlertPointerGestureOnMove(
  gesture: PositionalAlertPointerGesture,
  clientXPx: number,
  clientYPx: number,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): PositionalAlertPointerGesture {
  if (!gesture.pointerDown) return gesture;
  const dx = clientXPx - gesture.startXPx;
  const dy = clientYPx - gesture.startYPx;
  return {
    ...gesture,
    wasDragging: positionalAlertWasDraggingAfterPointerMove(
      gesture.wasDragging,
      dx,
      dy,
      maxMovementPx,
    ),
  };
}

export function positionalAlertShouldDismissGesture(
  gesture: PositionalAlertPointerGesture,
  clientXPx: number,
  clientYPx: number,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): boolean {
  const dx = clientXPx - gesture.startXPx;
  const dy = clientYPx - gesture.startYPx;
  return positionalAlertShouldDismissOnPointerUp(
    gesture.pointerDown,
    gesture.wasDragging,
    dx,
    dy,
    maxMovementPx,
  );
}

type PositionalAlertDismissListenerTarget = {
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
 * Observes pointer gestures on `target` (capture phase) without blocking them.
 * Invokes `onDismissAll` when a tap/click completes; drags do not dismiss.
 */
export function subscribePositionalAlertDismissOnTap(
  onDismissAll: () => void,
  target: PositionalAlertDismissListenerTarget = document,
  maxMovementPx: number = POSITIONAL_ALERT_TAP_MAX_MOVEMENT_PX,
): () => void {
  let gesture = INITIAL_POSITIONAL_ALERT_POINTER_GESTURE;
  const captureOpts: AddEventListenerOptions = { capture: true };

  const onPointerDown = (event: PointerEvent) => {
    gesture = positionalAlertPointerGestureOnDown(event.clientX, event.clientY);
  };

  const onPointerMove = (event: PointerEvent) => {
    gesture = positionalAlertPointerGestureOnMove(
      gesture,
      event.clientX,
      event.clientY,
      maxMovementPx,
    );
  };

  const onPointerUp = (event: PointerEvent) => {
    const shouldDismiss = positionalAlertShouldDismissGesture(
      gesture,
      event.clientX,
      event.clientY,
      maxMovementPx,
    );
    gesture = INITIAL_POSITIONAL_ALERT_POINTER_GESTURE;
    if (shouldDismiss) onDismissAll();
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
