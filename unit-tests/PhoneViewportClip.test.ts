import {
  phoneFrameCornerRadii,
  phoneViewportCornerCoverDraw,
  phoneViewportCornerCoverPath,
  phoneViewportFullRoundedClipPath,
  roundedInsetClipPath,
} from "../app/_client/pure/PhoneViewportClip";

describe("PhoneViewportClip", () => {
  const frame = { left: 100, top: 50, width: 360, height: 640 };
  const radius = 14;

  test("phoneFrameCornerRadii applies all four corners when element coincides with frame", () => {
    expect(phoneFrameCornerRadii(frame, frame, radius)).toEqual({
      topLeft: 14,
      topRight: 14,
      bottomRight: 14,
      bottomLeft: 14,
    });
  });

  test("phoneFrameCornerRadii applies only bottom corners when element is pushed down (danger band)", () => {
    const globe = {
      left: frame.left,
      top: frame.top + 40,
      width: frame.width,
      height: frame.height - 40,
    };
    expect(phoneFrameCornerRadii(frame, globe, radius)).toEqual({
      topLeft: 0,
      topRight: 0,
      bottomRight: 14,
      bottomLeft: 14,
    });
  });

  test("phoneFrameCornerRadii applies no corners when element is fully inset", () => {
    const inset = {
      left: frame.left + 10,
      top: frame.top + 10,
      width: frame.width - 20,
      height: frame.height - 20,
    };
    expect(phoneFrameCornerRadii(frame, inset, radius)).toEqual({
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    });
  });

  test("phoneFrameCornerRadii tolerates sub-pixel edge misalignment", () => {
    const nearly = {
      left: frame.left + 0.4,
      top: frame.top - 0.3,
      width: frame.width - 0.4,
      height: frame.height + 0.3,
    };
    expect(phoneFrameCornerRadii(frame, nearly, radius, 0.5)).toEqual({
      topLeft: 14,
      topRight: 14,
      bottomRight: 14,
      bottomLeft: 14,
    });
  });

  test("phoneFrameCornerRadii rejects edges beyond epsilon", () => {
    const off = {
      left: frame.left + 1,
      top: frame.top,
      width: frame.width - 1,
      height: frame.height,
    };
    expect(phoneFrameCornerRadii(frame, off, radius, 0.5)).toEqual({
      topLeft: 0,
      topRight: 14,
      bottomRight: 14,
      bottomLeft: 0,
    });
  });

  test("roundedInsetClipPath formats CSS inset round radii", () => {
    expect(
      roundedInsetClipPath({
        topLeft: 14,
        topRight: 14,
        bottomRight: 0,
        bottomLeft: 0,
      }),
    ).toBe("inset(0 round 14px 14px 0px 0px)");
  });

  test("phoneViewportFullRoundedClipPath rounds all corners", () => {
    expect(phoneViewportFullRoundedClipPath(14)).toBe(
      "inset(0 round 14px 14px 14px 14px)",
    );
  });

  test("phoneViewportCornerCoverPath covers the outside wedge for each corner", () => {
    expect(phoneViewportCornerCoverPath("topLeft", 14)).toBe(
      "M0 0 H14 A14 14 0 0 0 0 14 Z",
    );
    expect(phoneViewportCornerCoverPath("topRight", 14)).toBe(
      "M14 0 H0 A14 14 0 0 1 14 14 Z",
    );
    expect(phoneViewportCornerCoverPath("bottomRight", 14)).toBe(
      "M14 14 V0 A14 14 0 0 1 0 14 Z",
    );
    expect(phoneViewportCornerCoverPath("bottomLeft", 14)).toBe(
      "M0 14 H14 A14 14 0 0 1 0 0 Z",
    );
  });

  test("phoneViewportCornerCoverDraw mirrors top-left into top-right", () => {
    const topLeft = phoneViewportCornerCoverDraw("topLeft", 14);
    const topRight = phoneViewportCornerCoverDraw("topRight", 14);
    expect(topRight.path).toBe(topLeft.path);
    expect(topRight.transform).toBe("translate(14 0) scale(-1 1)");
    expect(topLeft.transform).toBeUndefined();
  });
});
