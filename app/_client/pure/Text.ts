import {
  NOTOSANS_BOLD_CLASS,
  NOTOSANS_LIGHT_CLASS,
  NOTOSANS_REGULAR_CLASS,
} from "../../_server/Fonts";

/** Text weight font class (see specifications/text_weight.md). */
export type TextDescriptorWeight =
  | typeof NOTOSANS_REGULAR_CLASS
  | typeof NOTOSANS_BOLD_CLASS
  | typeof NOTOSANS_LIGHT_CLASS
  | string;

/** Text descriptor (see specifications/text.md). */
export type TextDescriptor = {
  content: string;
  color: string;
  fontSize?: number;
  weight?: TextDescriptorWeight;
};

export const TEXT_DEFAULT_FONT_SIZE_PX = 14;

export const TextDescriptorWeight = {
  REGULAR: NOTOSANS_REGULAR_CLASS,
  BOLD: NOTOSANS_BOLD_CLASS,
  LIGHT: NOTOSANS_LIGHT_CLASS,
} as const;

export function createTextDescriptor(
  content: string,
  color: string,
  options?: {
    fontSize?: number;
    weight?: TextDescriptorWeight;
  },
): TextDescriptor {
  return {
    content,
    color,
    ...(options?.fontSize != null ? { fontSize: options.fontSize } : {}),
    ...(options?.weight != null ? { weight: options.weight } : {}),
  };
}

export function resolveTextContent(
  text: TextDescriptor | null | undefined,
): string | null {
  if (text == null) {
    return null;
  }
  return text.content;
}

export function resolveTextColor(
  text: TextDescriptor | null | undefined,
): string | null {
  if (text == null) {
    return null;
  }
  return text.color;
}

export function resolveTextFontSizePx(
  text: TextDescriptor | null | undefined,
  defaultFontSizePx: number = TEXT_DEFAULT_FONT_SIZE_PX,
): number {
  if (text?.fontSize != null) {
    return text.fontSize;
  }
  return defaultFontSizePx;
}

export function resolveTextWeight(
  text: TextDescriptor | null | undefined,
  defaultWeight: TextDescriptorWeight = TextDescriptorWeight.REGULAR,
): TextDescriptorWeight {
  if (text?.weight != null) {
    return text.weight;
  }
  return defaultWeight;
}

export function hasTextDescriptorContent(
  text: TextDescriptor | null | undefined,
): boolean {
  return resolveTextContent(text) != null && resolveTextContent(text)!.length > 0;
}
