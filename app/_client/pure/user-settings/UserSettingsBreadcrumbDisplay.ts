export const USER_SETTINGS_BREADCRUMB_ELLIPSIS = "...";

export function userSettingsBreadcrumbPlainText(segments: string[]): string {
  return segments.join(" > ");
}

/** Width of rendered breadcrumb segments with dimmed ">" separators between them. */
export function userSettingsBreadcrumbSegmentsWidthPx(
  segments: string[],
  measureSegmentPx: (text: string) => number,
  measureSeparatorPx: (text: string) => number,
): number {
  if (segments.length === 0) {
    return 0;
  }

  let width = measureSegmentPx(segments[0]);
  for (let index = 1; index < segments.length; index += 1) {
    width += measureSeparatorPx(" ");
    width += measureSeparatorPx(">");
    width += measureSeparatorPx(" ");
    width += measureSegmentPx(segments[index]);
  }
  return width;
}

/** Keeps the tail of `text` and prefixes with an ellipsis so the result fits `maxWidthPx`. */
export function truncateTextTailToFitWidthPx(
  text: string,
  maxWidthPx: number,
  measureWidthPx: (value: string) => number,
  ellipsis: string = USER_SETTINGS_BREADCRUMB_ELLIPSIS,
): string {
  if (text.length === 0 || maxWidthPx <= 0) {
    return text;
  }

  if (measureWidthPx(text) <= maxWidthPx) {
    return text;
  }

  const ellipsisWidthPx = measureWidthPx(ellipsis);
  if (ellipsisWidthPx >= maxWidthPx) {
    let shortened = ellipsis;
    while (shortened.length > 1 && measureWidthPx(shortened) > maxWidthPx) {
      shortened = shortened.slice(0, -1);
    }
    return shortened;
  }

  const availableTailWidthPx = maxWidthPx - ellipsisWidthPx;
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const tail = text.slice(-mid);
    if (measureWidthPx(tail) <= availableTailWidthPx) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return ellipsis + text.slice(-low);
}
