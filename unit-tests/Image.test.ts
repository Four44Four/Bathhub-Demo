import {
  createImageDescriptor,
  createMonoColorImage,
  createMultiColorImage,
  findNonBlackSvgHexColors,
  IMAGE_DEFAULT_MONO_COLOR,
  resolveImageMonoColor,
  warnIfMonoColorSvgNotUniformlyBlack,
} from "../app/_client/pure/Image";

describe("createImageDescriptor", () => {
  test("creates a mono-color image with default mono color", () => {
    expect(createMonoColorImage("/icon.svg")).toEqual({
      path: "/icon.svg",
      type: "mono-color",
      monoColor: IMAGE_DEFAULT_MONO_COLOR,
    });
  });

  test("creates a mono-color image with an explicit tint", () => {
    expect(createMonoColorImage("/icon.svg", "#E4E4FF")).toEqual({
      path: "/icon.svg",
      type: "mono-color",
      monoColor: "#E4E4FF",
    });
  });

  test("omits monoColor for multi-color images", () => {
    expect(createMultiColorImage("/photo.png")).toEqual({
      path: "/photo.png",
      type: "multi-color",
    });
    expect(createImageDescriptor("/photo.png", "multi-color", "#ff0000")).toEqual(
      {
        path: "/photo.png",
        type: "multi-color",
      },
    );
  });
});

describe("resolveImageMonoColor", () => {
  test("returns null for missing or multi-color images", () => {
    expect(resolveImageMonoColor(null)).toBeNull();
    expect(resolveImageMonoColor(undefined)).toBeNull();
    expect(resolveImageMonoColor(createMultiColorImage("/a.png"))).toBeNull();
  });

  test("returns the mono tint, defaulting when omitted", () => {
    expect(
      resolveImageMonoColor({ path: "/a.svg", type: "mono-color" }),
    ).toBe(IMAGE_DEFAULT_MONO_COLOR);
    expect(
      resolveImageMonoColor(createMonoColorImage("/a.svg", "#abcabc")),
    ).toBe("#abcabc");
  });
});

describe("findNonBlackSvgHexColors", () => {
  test("returns empty when fills are black", () => {
    expect(
      findNonBlackSvgHexColors('<path fill="#000000" stroke="#000" />'),
    ).toEqual([]);
  });

  test("returns unique non-black hex colors", () => {
    expect(
      findNonBlackSvgHexColors(
        '<path fill="#E4E4FF" stroke="#FF0000" /><circle fill="#E4E4FF" />',
      ),
    ).toEqual(["#E4E4FF", "#FF0000"]);
  });
});

describe("warnIfMonoColorSvgNotUniformlyBlack", () => {
  test("warns when non-black colors are present", () => {
    const warn = jest.fn();
    warnIfMonoColorSvgNotUniformlyBlack(
      "/icon.svg",
      '<path fill="#123456" />',
      warn,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("/icon.svg");
    expect(warn.mock.calls[0][0]).toContain("#123456");
  });

  test("does not warn for uniformly black markup", () => {
    const warn = jest.fn();
    warnIfMonoColorSvgNotUniformlyBlack(
      "/icon.svg",
      '<path fill="#000000" />',
      warn,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
