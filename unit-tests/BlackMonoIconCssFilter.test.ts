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

  test("caches repeated lookups", () => {
    const first = blackMonoIconCssFilter("#FF0000");
    const second = blackMonoIconCssFilter("#FF0000");
    expect(second).toBe(first);
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
