import {
  TEXT_DEFAULT_FONT_SIZE_PX,
  TextDescriptorWeight,
  createTextDescriptor,
  hasTextDescriptorContent,
  resolveTextColor,
  resolveTextContent,
  resolveTextFontSizePx,
  resolveTextWeight,
} from "../app/_client/pure/Text";

describe("createTextDescriptor", () => {
  test("creates a descriptor with required fields", () => {
    expect(createTextDescriptor("Hello", "#ffffff")).toEqual({
      content: "Hello",
      color: "#ffffff",
    });
  });

  test("includes optional font size and weight", () => {
    expect(
      createTextDescriptor("Hello", "#ffffff", {
        fontSize: 16,
        weight: TextDescriptorWeight.BOLD,
      }),
    ).toEqual({
      content: "Hello",
      color: "#ffffff",
      fontSize: 16,
      weight: TextDescriptorWeight.BOLD,
    });
  });
});

describe("resolveTextContent", () => {
  test("returns null when text is absent", () => {
    expect(resolveTextContent(null)).toBeNull();
    expect(resolveTextContent(undefined)).toBeNull();
  });

  test("returns descriptor content", () => {
    expect(
      resolveTextContent(createTextDescriptor("Save changes", "#000000")),
    ).toBe("Save changes");
  });
});

describe("resolveTextColor", () => {
  test("returns null when text is absent", () => {
    expect(resolveTextColor(null)).toBeNull();
  });

  test("returns descriptor color", () => {
    expect(resolveTextColor(createTextDescriptor("Back", "#123456"))).toBe(
      "#123456",
    );
  });
});

describe("resolveTextFontSizePx", () => {
  test("uses the text.md default when font size is omitted", () => {
    expect(resolveTextFontSizePx(createTextDescriptor("A", "#000000"))).toBe(
      TEXT_DEFAULT_FONT_SIZE_PX,
    );
  });

  test("uses the descriptor font size when provided", () => {
    expect(
      resolveTextFontSizePx(
        createTextDescriptor("A", "#000000", { fontSize: 18 }),
      ),
    ).toBe(18);
  });
});

describe("resolveTextWeight", () => {
  test("uses TextWeight.REGULAR by default", () => {
    expect(resolveTextWeight(createTextDescriptor("A", "#000000"))).toBe(
      TextDescriptorWeight.REGULAR,
    );
  });

  test("uses the descriptor weight when provided", () => {
    expect(
      resolveTextWeight(
        createTextDescriptor("A", "#000000", {
          weight: TextDescriptorWeight.BOLD,
        }),
      ),
    ).toBe(TextDescriptorWeight.BOLD);
  });
});

describe("hasTextDescriptorContent", () => {
  test("returns false for null or empty content", () => {
    expect(hasTextDescriptorContent(null)).toBe(false);
    expect(
      hasTextDescriptorContent(createTextDescriptor("", "#000000")),
    ).toBe(false);
  });

  test("returns true when content is present", () => {
    expect(
      hasTextDescriptorContent(createTextDescriptor("Test", "#000000")),
    ).toBe(true);
  });
});
