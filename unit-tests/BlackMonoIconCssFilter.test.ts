import {
  blackMonoIconCssFilter,
  blackMonoIconCssFilterWithBrightness,
  composeCssFilters,
} from "../app/_client/pure/svg/BlackMonoIconCssFilter";

describe("blackMonoIconCssFilter", () => {
  test("returns base filter for black", () => {
    expect(blackMonoIconCssFilter("#000000")).toBe("brightness(0) saturate(100%)");
    expect(blackMonoIconCssFilter("#000")).toBe("brightness(0) saturate(100%)");
  });

  test("returns a recolor chain for non-black targets", () => {
    const filter = blackMonoIconCssFilter("#E4E4FF");
    expect(filter.startsWith("brightness(0) saturate(100%)")).toBe(true);
    expect(filter).toContain("invert(");
    expect(filter).toContain("hue-rotate(");
  });

  test("uses SSR-stable precomputed filter for #E4E4FF", () => {
    expect(blackMonoIconCssFilter("#E4E4FF")).toBe(
      "brightness(0) saturate(100%) invert(86%) sepia(11%) saturate(1160%) hue-rotate(198deg) brightness(104%) contrast(101%)",
    );
    expect(blackMonoIconCssFilter("#e4e4ff")).toBe(blackMonoIconCssFilter("#E4E4FF"));
  });

  test("uses SSR-stable precomputed filter for inverted viewport icon color", () => {
    expect(blackMonoIconCssFilter("#00001B")).toBe(
      "brightness(0) saturate(100%) invert(7%) sepia(16%) saturate(7088%) hue-rotate(232deg) brightness(91%) contrast(125%)",
    );
    expect(blackMonoIconCssFilter("#00001b")).toBe(blackMonoIconCssFilter("#00001B"));
  });

  test("caches repeated lookups", () => {
    const first = blackMonoIconCssFilter("#FF0000");
    const second = blackMonoIconCssFilter("#FF0000");
    expect(second).toBe(first);
  });

  test("produces identical filters across cold module loads (SSR vs client hydration)", () => {
    let firstLoad = "";
    jest.isolateModules(() => {
      const { blackMonoIconCssFilter: compute } =
        jest.requireActual<
          typeof import("../app/_client/pure/svg/BlackMonoIconCssFilter")
        >("../app/_client/pure/svg/BlackMonoIconCssFilter");
      firstLoad = compute("#E4E4FF");
    });
    jest.isolateModules(() => {
      const { blackMonoIconCssFilter: compute } =
        jest.requireActual<
          typeof import("../app/_client/pure/svg/BlackMonoIconCssFilter")
        >("../app/_client/pure/svg/BlackMonoIconCssFilter");
      expect(compute("#E4E4FF")).toBe(firstLoad);
    });
  });
});

describe("composeCssFilters", () => {
  test("joins non-empty parts", () => {
    expect(composeCssFilters("brightness(0)", "brightness(0.7)")).toBe(
      "brightness(0) brightness(0.7)",
    );
    expect(composeCssFilters("brightness(0)", "", "contrast(1)")).toBe(
      "brightness(0) contrast(1)",
    );
  });
});

describe("blackMonoIconCssFilterWithBrightness", () => {
  test("skips brightness multiplier when factor is 1", () => {
    expect(blackMonoIconCssFilterWithBrightness("#000000", 1)).toBe(
      "brightness(0) saturate(100%)",
    );
  });

  test("appends brightness multiplier", () => {
    expect(blackMonoIconCssFilterWithBrightness("#000000", 0.7)).toBe(
      "brightness(0) saturate(100%) brightness(0.7)",
    );
  });
});
