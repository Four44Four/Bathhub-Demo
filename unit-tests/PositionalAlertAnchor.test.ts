import {
  anchorBoundingRectPx,
  anchorClientRectChanged,
  collectOffsetAncestors,
  POSITIONAL_ALERT_Z_STACK_OFFSET,
  positionalAlertAnchorIsAttached,
  positionalAlertIdsWithDetachedAnchors,
  positionalAlertIsUnderSwipeMenuLayer,
  positionalAlertMaxAncestorZIndex,
  positionalAlertZIndexForAnchor,
  SWIPE_MENU_LAYER_Z_INDEX,
  subscribePositionalAlertAnchorLayout,
} from "../app/_client/pure/viewport2d/PositionalAlertAnchor";
import { alertSystemShowPositional, EMPTY_ALERT_SYSTEM_STATE } from "../app/_client/pure/viewport2d/AlertSystemState";

function mockStyleMap(
  entries: ReadonlyMap<Element, Partial<{ zIndex: string }>>,
): (element: Element) => { zIndex: string } {
  return (element) => ({
    zIndex: entries.get(element)?.zIndex ?? "auto",
  });
}

describe("PositionalAlertAnchor", () => {
  test("positionalAlertZIndexForAnchor stacks viewport2d alerts below swipe menu", () => {
    const viewportLayer = { parentElement: null } as HTMLElement;
    const anchor = { parentElement: viewportLayer } as HTMLElement;
    const getComputedStyle = mockStyleMap(
      new Map([
        [anchor, { zIndex: "0" }],
        [viewportLayer, { zIndex: "20" }],
      ]),
    );

    expect(positionalAlertZIndexForAnchor(anchor, getComputedStyle)).toBe(30);
    expect(positionalAlertIsUnderSwipeMenuLayer(anchor, getComputedStyle)).toBe(false);
  });

  test("positionalAlertZIndexForAnchor caps recenter-tier anchors below swipe backdrop", () => {
    const recenterLayer = { parentElement: null } as HTMLElement;
    const anchor = { parentElement: recenterLayer } as HTMLElement;
    const getComputedStyle = mockStyleMap(
      new Map([
        [anchor, { zIndex: "0" }],
        [recenterLayer, { zIndex: "38" }],
      ]),
    );

    expect(positionalAlertZIndexForAnchor(anchor, getComputedStyle)).toBe(38);
  });

  test("positionalAlertZIndexForAnchor allows swipe menu alerts above menu layer", () => {
    const menuLayer = { parentElement: null } as HTMLElement;
    const content = { parentElement: menuLayer } as HTMLElement;
    const anchor = { parentElement: content } as HTMLElement;
    const getComputedStyle = mockStyleMap(
      new Map([
        [anchor, { zIndex: "0" }],
        [content, { zIndex: "auto" }],
        [menuLayer, { zIndex: "40" }],
      ]),
    );

    expect(positionalAlertMaxAncestorZIndex(anchor, getComputedStyle)).toBe(40);
    expect(positionalAlertIsUnderSwipeMenuLayer(anchor, getComputedStyle)).toBe(true);
    expect(positionalAlertZIndexForAnchor(anchor, getComputedStyle)).toBe(
      SWIPE_MENU_LAYER_Z_INDEX + POSITIONAL_ALERT_Z_STACK_OFFSET,
    );
  });

  test("anchorClientRectChanged detects position and size changes", () => {
    const prev = { left: 10, top: 20, width: 40, height: 30 };
    expect(anchorClientRectChanged(null, prev)).toBe(true);
    expect(anchorClientRectChanged(prev, { ...prev })).toBe(false);
    expect(anchorClientRectChanged(prev, { ...prev, top: 21 })).toBe(true);
    expect(anchorClientRectChanged(prev, { ...prev, width: 41 })).toBe(true);
  });

  test("collectOffsetAncestors walks parent chain", () => {
    const root = { parentElement: null } as HTMLElement;
    const mid = { parentElement: root } as HTMLElement;
    const anchor = { parentElement: mid } as HTMLElement;

    expect(collectOffsetAncestors(anchor)).toEqual([mid, root]);
  });

  test("positionalAlertAnchorIsAttached uses isConnected when available", () => {
    const attached = { isConnected: true } as HTMLElement;
    const detached = { isConnected: false } as HTMLElement;
    expect(positionalAlertAnchorIsAttached(attached)).toBe(true);
    expect(positionalAlertAnchorIsAttached(detached)).toBe(false);
  });

  test("positionalAlertAnchorIsAttached falls back to document.contains", () => {
    const anchor = {} as HTMLElement;
    expect(positionalAlertAnchorIsAttached(anchor, () => true)).toBe(true);
    expect(positionalAlertAnchorIsAttached(anchor, () => false)).toBe(false);
  });

  test("positionalAlertIdsWithDetachedAnchors returns ids for missing or detached anchors", () => {
    const state = alertSystemShowPositional(
      alertSystemShowPositional(EMPTY_ALERT_SYSTEM_STATE, "a", "one", "up"),
      "b",
      "two",
      "down",
    );
    const attached = { isConnected: true } as HTMLElement;
    const detached = { isConnected: false } as HTMLElement;
    const anchors = new Map<string, HTMLElement>([
      ["a", attached],
      ["b", detached],
    ]);

    expect(
      positionalAlertIdsWithDetachedAnchors(state.positional, (id) => anchors.get(id)),
    ).toEqual(["b"]);

    anchors.delete("a");
    expect(
      positionalAlertIdsWithDetachedAnchors(state.positional, (id) => anchors.get(id)),
    ).toEqual(["a", "b"]);
  });

  test("anchorBoundingRectPx maps DOMRect fields when borders are zero", () => {
    const anchor = {
      getBoundingClientRect: () =>
        ({
          left: 5,
          top: 6,
          width: 7,
          height: 8,
        }) as DOMRect,
    } as HTMLElement;
    const readBorderStyle = () =>
      ({
        borderTopWidth: "0px",
        borderRightWidth: "0px",
        borderBottomWidth: "0px",
        borderLeftWidth: "0px",
      }) as CSSStyleDeclaration;

    expect(anchorBoundingRectPx(anchor, readBorderStyle)).toEqual({
      left: 5,
      top: 6,
      width: 7,
      height: 8,
    });
  });

  test("anchorBoundingRectPx insets CSS border widths from border box", () => {
    const anchor = {
      getBoundingClientRect: () =>
        ({
          left: 10,
          top: 20,
          width: 102,
          height: 52,
        }) as DOMRect,
    } as HTMLElement;
    const readBorderStyle = () =>
      ({
        borderTopWidth: "2px",
        borderRightWidth: "1px",
        borderBottomWidth: "3px",
        borderLeftWidth: "4px",
      }) as CSSStyleDeclaration;

    expect(anchorBoundingRectPx(anchor, readBorderStyle)).toEqual({
      left: 14,
      top: 22,
      width: 97,
      height: 47,
    });
  });

  test("subscribePositionalAlertAnchorLayout observes anchor and ancestors", () => {
    const observed: Element[] = [];
    let layoutListenerCount = 0;
    const raf = { tick: null as (() => void) | null };

    const parent = { parentElement: null } as HTMLElement;
    let attached = true;
    const anchor = {
      parentElement: parent,
      get isConnected() {
        return attached;
      },
      getBoundingClientRect: () =>
        ({
          left: 0,
          top: 0,
          width: 10,
          height: 10,
        }) as DOMRect,
    } as HTMLElement;

    const unsubscribe = subscribePositionalAlertAnchorLayout(
      anchor,
      {
        onLayoutChange: () => {
          layoutListenerCount += 1;
        },
      },
      {
        createResizeObserver: (callback) => ({
          observe: (target) => {
            observed.push(target);
            callback();
          },
          disconnect: () => {
            observed.length = 0;
          },
        }),
        requestAnimationFrame: (callback) => {
          raf.tick = callback;
          return 1;
        },
        cancelAnimationFrame: () => {},
        layoutListenerTarget: {
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      },
    );

    expect(observed).toEqual([anchor, parent]);
    expect(layoutListenerCount).toBeGreaterThanOrEqual(1);

    raf.tick?.();
    expect(layoutListenerCount).toBeGreaterThanOrEqual(2);

    unsubscribe();
    expect(observed).toEqual([]);
  });

  test("subscribePositionalAlertAnchorLayout calls onAnchorDetached when anchor leaves document", () => {
    const raf = { tick: null as (() => void) | null };
    let attached = true;
    let detachCount = 0;

    const anchor = {
      get isConnected() {
        return attached;
      },
      parentElement: null,
      getBoundingClientRect: () =>
        ({
          left: 0,
          top: 0,
          width: 10,
          height: 10,
        }) as DOMRect,
    } as HTMLElement;

    subscribePositionalAlertAnchorLayout(
      anchor,
      {
        onLayoutChange: () => {},
        onAnchorDetached: () => {
          detachCount += 1;
        },
      },
      {
        createResizeObserver: () => ({
          observe: () => {},
          disconnect: () => {},
        }),
        requestAnimationFrame: (callback) => {
          raf.tick = callback;
          return 1;
        },
        cancelAnimationFrame: () => {},
        layoutListenerTarget: {
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      },
    );

    attached = false;
    raf.tick?.();
    expect(detachCount).toBe(1);
  });

  test("subscribePositionalAlertAnchorLayout dismisses immediately when anchor already detached", () => {
    let detachCount = 0;
    const anchor = { isConnected: false } as HTMLElement;

    subscribePositionalAlertAnchorLayout(anchor, {
      onLayoutChange: () => {},
      onAnchorDetached: () => {
        detachCount += 1;
      },
    });

    expect(detachCount).toBe(1);
  });
});
