import {
  parseCssBorderWidthPx,
  positionalAlertClipPathInset,
  positionalAlertPlacement,
  positionalAlertTailBox,
  positionalAlertVisualBounds,
  rectPxInsetByBorder,
  POSITIONAL_ALERT_TAIL_SIZE_PX,
} from "../app/_client/pure/PositionalAlertLayout";

describe("PositionalAlertLayout", () => {
  const clipRect = { left: 0, top: 0, width: 400, height: 800 };
  const bubble = { width: 160, height: 48 };
  const tailSize = POSITIONAL_ALERT_TAIL_SIZE_PX;

  test("positionalAlertPlacement places bubble above anchor when side is up", () => {
    const anchor = { left: 120, top: 300, width: 40, height: 40 };
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      clipRect,
      "up",
    );
    expect(placement.tailDirection).toBe("down");
    expect(placement.top).toBeLessThan(anchor.top);
    expect(placement.left).toBeGreaterThanOrEqual(8);
  });

  test("positionalAlertPlacement places bubble below anchor when side is down", () => {
    const anchor = { left: 120, top: 300, width: 40, height: 40 };
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      clipRect,
      "down",
    );
    expect(placement.tailDirection).toBe("up");
    expect(placement.top).toBeGreaterThan(anchor.top + anchor.height);
  });

  test("positionalAlertPlacement clamps to offset phone clip rect", () => {
    const phone = { left: 50, top: 100, width: 300, height: 600 };
    const anchor = { left: 80, top: 120, width: 40, height: 40 };
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      phone,
      "up",
    );
    expect(placement.left).toBeGreaterThanOrEqual(phone.left + 8);
    expect(placement.left + bubble.width).toBeLessThanOrEqual(phone.left + phone.width - 8);
    expect(placement.top).toBeGreaterThanOrEqual(phone.top + 8);
  });

  test("positionalAlertClipPathInset trims overflow outside phone bounds", () => {
    const placement = {
      left: 20,
      top: 10,
      tailDirection: "down" as const,
      tailOffsetPx: 80,
    };
    const bounds = positionalAlertVisualBounds(placement, bubble.width, bubble.height);
    const phone = { left: 0, top: 0, width: 200, height: 40 };
    expect(positionalAlertClipPathInset(bounds, phone)).toBe(
      "inset(0px 0px 28px 0px)",
    );
  });

  test("rectPxInsetByBorder shrinks a border box by border widths", () => {
    expect(
      rectPxInsetByBorder(
        { left: 10, top: 20, width: 102, height: 52 },
        { top: 2, right: 1, bottom: 3, left: 4 },
      ),
    ).toEqual({ left: 14, top: 22, width: 97, height: 47 });
  });

  test("parseCssBorderWidthPx parses computed border strings", () => {
    expect(parseCssBorderWidthPx("1px")).toBe(1);
    expect(parseCssBorderWidthPx("0")).toBe(0);
    expect(parseCssBorderWidthPx("invalid")).toBe(0);
  });

  test("positionalAlertPlacement offsets tail from parent top by parentEdgeOffsetPx when side is up", () => {
    const anchor = { left: 120, top: 300, width: 40, height: 40 };
    const edgeOffset = 24;
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      clipRect,
      "up",
      tailSize,
      edgeOffset,
    );
    const bounds = positionalAlertVisualBounds(placement, bubble.width, bubble.height);
    const tailBottom = bounds.top + bounds.height;
    expect(tailBottom).toBe(anchor.top - edgeOffset);
  });

  test("positionalAlertPlacement offsets tail from parent bottom by parentEdgeOffsetPx when side is down", () => {
    const anchor = { left: 120, top: 300, width: 40, height: 40 };
    const edgeOffset = 24;
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      clipRect,
      "down",
      tailSize,
      edgeOffset,
    );
    const bounds = positionalAlertVisualBounds(placement, bubble.width, bubble.height);
    expect(bounds.top).toBe(anchor.top + anchor.height + edgeOffset);
  });

  test("positionalAlertPlacement with zero margin places tail tip on anchor top edge when side is up", () => {
    const anchor = { left: 120, top: 300, width: 40, height: 40 };
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      clipRect,
      "up",
      tailSize,
      0,
    );
    const bounds = positionalAlertVisualBounds(placement, bubble.width, bubble.height);
    expect(bounds.top + bounds.height).toBe(anchor.top);
  });

  test("positionalAlertPlacement with zero margin places tail tip on anchor bottom edge when side is down", () => {
    const anchor = { left: 120, top: 300, width: 40, height: 40 };
    const placement = positionalAlertPlacement(
      anchor,
      bubble.width,
      bubble.height,
      clipRect,
      "down",
      tailSize,
      0,
    );
    const bounds = positionalAlertVisualBounds(placement, bubble.width, bubble.height);
    expect(bounds.top).toBe(anchor.top + anchor.height);
  });

  test("positionalAlertTailBox for downward tail", () => {
    const placement = {
      left: 100,
      top: 200,
      tailDirection: "down" as const,
      tailOffsetPx: 80,
    };
    const tail = positionalAlertTailBox(
      placement,
      POSITIONAL_ALERT_TAIL_SIZE_PX,
      "#ff0000",
    );
    expect(tail.borderTop).toContain("#ff0000");
    expect(tail.left).toBe(70);
  });
});
