/** Image resource descriptor (see specifications/image.md). */
export type ImageColorMode = "mono-color" | "multi-color";

export type ImageDescriptor = {
  path: string;
  type: ImageColorMode;
  /** Target tint for mono-color icons. Ignored when `type` is `"multi-color"`. */
  monoColor?: string;
};

export const IMAGE_DEFAULT_MONO_COLOR = "#000000";

export function createImageDescriptor(
  path: string,
  type: ImageColorMode,
  monoColor: string = IMAGE_DEFAULT_MONO_COLOR,
): ImageDescriptor {
  if (type === "multi-color") {
    return { path, type };
  }
  return { path, type, monoColor };
}

export function createMonoColorImage(
  path: string,
  monoColor: string = IMAGE_DEFAULT_MONO_COLOR,
): ImageDescriptor {
  return createImageDescriptor(path, "mono-color", monoColor);
}

export function createMultiColorImage(path: string): ImageDescriptor {
  return createImageDescriptor(path, "multi-color");
}

/** Resolved mono-color tint, or `null` when the image is multi-color / absent. */
export function resolveImageMonoColor(
  image: ImageDescriptor | null | undefined,
): string | null {
  if (image == null || image.type !== "mono-color") {
    return null;
  }
  return image.monoColor ?? IMAGE_DEFAULT_MONO_COLOR;
}

const HEX_COLOR_ATTR_PATTERN =
  /(fill|stroke)\s*=\s*(["'])(#[0-9A-Fa-f]{3,8})\2/gi;

const BLACK_HEXES = new Set(["#000", "#000000"]);

/** Returns non-black hex fill/stroke values found in SVG markup (mono-color policy). */
export function findNonBlackSvgHexColors(svgMarkup: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  HEX_COLOR_ATTR_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HEX_COLOR_ATTR_PATTERN.exec(svgMarkup)) != null) {
    const hex = match[3].toLowerCase();
    if (BLACK_HEXES.has(hex)) continue;
    if (seen.has(hex)) continue;
    seen.add(hex);
    found.push(match[3]);
  }
  return found;
}

/**
 * Warns when a mono-color SVG is not uniformly `#000000`
 * (see specifications/image.md mono-color icon policy).
 */
export function warnIfMonoColorSvgNotUniformlyBlack(
  imagePath: string,
  svgMarkup: string,
  warn: (message: string) => void = console.warn,
): void {
  const nonBlack = findNonBlackSvgHexColors(svgMarkup);
  if (nonBlack.length === 0) return;
  warn(
    `[image.md] Mono-color icon "${imagePath}" is not uniformly #000000; found: ${nonBlack.join(", ")}`,
  );
}
