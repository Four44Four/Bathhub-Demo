import {
  VIEWPORT2D_BUTTON_ABOVE_ANCHOR_Z_OFFSET,
  viewport2dButtonZIndex,
} from "../app/_client/pure/viewport2d/Viewport2dButtonZIndex";
import { VIEWPORT2D_TOP_LAYER_Z_INDEX } from "../app/_client/pure/viewport2d/PositionalAlertAnchor";

function mockStyleMap(
  entries: ReadonlyMap<Element, Partial<{ zIndex: string }>>,
): (element: Element) => { zIndex: string } {
  return (element) => ({
    zIndex: entries.get(element)?.zIndex ?? "auto",
  });
}

describe("viewport2dButtonZIndex", () => {
  test("uses viewport2d top layer when anchor is null", () => {
    expect(
      viewport2dButtonZIndex(null, mockStyleMap(new Map())),
    ).toBe(VIEWPORT2D_TOP_LAYER_Z_INDEX);
  });

  test("stacks above the anchor element's highest ancestor z-index", () => {
    const layer = { parentElement: null } as HTMLElement;
    const anchor = { parentElement: layer } as HTMLElement;
    const getComputedStyle = mockStyleMap(
      new Map([
        [anchor, { zIndex: "2" }],
        [layer, { zIndex: "5" }],
      ]),
    );

    expect(viewport2dButtonZIndex(anchor, getComputedStyle)).toBe(
      5 + VIEWPORT2D_BUTTON_ABOVE_ANCHOR_Z_OFFSET,
    );
  });
});
