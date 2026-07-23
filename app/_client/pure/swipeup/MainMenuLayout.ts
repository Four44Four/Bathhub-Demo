import {
  SwipeUpMainMenu,
  SwipeUpMainMenuButton,
} from "../../ComponentConstants";

export type SwipeUpMainMenuRowItem = {
  width: string;
  text: string | null;
};

export const SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS: readonly SwipeUpMainMenuRowItem[] =
  [
    {
      width: SwipeUpMainMenuButton.FULL_GRID_CELL_WIDTH,
      text: "Edit user settings",
    },
    {
      width: SwipeUpMainMenuButton.FULL_GRID_CELL_WIDTH,
      text: "Add bathroom",
    },
  ];

export function swipeUpMainMenuGridContentWidthPx(
  viewportWidthPx: number,
): number {
  return Math.max(
    0,
    viewportWidthPx - SwipeUpMainMenu.MARGIN_SIDE_PX * 2,
  );
}

/** Equal-width column inside the 4-column main-menu grid. */
export function swipeUpMainMenuGridColumnWidthPx(
  viewportWidthPx: number,
): number {
  const contentWidthPx = swipeUpMainMenuGridContentWidthPx(viewportWidthPx);
  const gapTotalPx =
    (SwipeUpMainMenu.GRID_COLUMNS - 1) * SwipeUpMainMenu.GAP_PX;
  return Math.max(
    0,
    (contentWidthPx - gapTotalPx) / SwipeUpMainMenu.GRID_COLUMNS,
  );
}

export function resolveSwipeUpMainMenuButtonWidthPx(
  width: string,
  viewportWidthPx: number,
): number {
  if (width === SwipeUpMainMenuButton.FULL_GRID_CELL_WIDTH) {
    return swipeUpMainMenuGridColumnWidthPx(viewportWidthPx);
  }

  const pxMatch = /^(\d+(?:\.\d+)?)px$/.exec(width.trim());
  if (pxMatch) {
    return Math.max(0, Number(pxMatch[1]));
  }

  const percentMatch = /^(\d+(?:\.\d+)?)%$/.exec(width.trim());
  if (percentMatch) {
    const ratio = Number(percentMatch[1]) / 100;
    return swipeUpMainMenuGridContentWidthPx(viewportWidthPx) * ratio;
  }

  return swipeUpMainMenuGridColumnWidthPx(viewportWidthPx);
}

export function resolveSwipeUpMainMenuButtonMinHeightPx(
  minHeight: string,
  rowHeightPx: number,
): number {
  if (minHeight === SwipeUpMainMenuButton.FULL_GRID_ROW_MIN_HEIGHT) {
    return Math.max(0, rowHeightPx);
  }

  const pxMatch = /^(\d+(?:\.\d+)?)px$/.exec(minHeight.trim());
  if (pxMatch) {
    return Math.max(0, Number(pxMatch[1]));
  }

  const percentMatch = /^(\d+(?:\.\d+)?)%$/.exec(minHeight.trim());
  if (percentMatch) {
    const ratio = Number(percentMatch[1]) / 100;
    return Math.max(0, rowHeightPx * ratio);
  }

  return 0;
}

export function swipeUpMainMenuButtonContentWidthPx(
  buttonWidthPx: number,
): number {
  return Math.max(
    0,
    buttonWidthPx - SwipeUpMainMenuButton.PADDING_HORIZONTAL_PX * 2,
  );
}

export function swipeUpMainMenuButtonImageSizePx(buttonWidthPx: number): number {
  return buttonWidthPx * SwipeUpMainMenuButton.IMAGE_WIDTH_RATIO;
}

export function swipeUpMainMenuButtonTextLineCount(
  text: string | null,
  buttonWidthPx: number,
): number {
  if (text == null || text.trim().length === 0) {
    return 0;
  }

  const contentWidthPx = swipeUpMainMenuButtonContentWidthPx(buttonWidthPx);
  const approxCharWidthPx = SwipeUpMainMenuButton.TEXT_FONT_SIZE * 0.6;
  const charsPerLine = Math.max(
    1,
    Math.floor(contentWidthPx / approxCharWidthPx),
  );
  const words = text.trim().split(/\s+/);
  let lines = 1;
  let currentLineChars = 0;

  for (const word of words) {
    const nextLineChars =
      currentLineChars === 0 ? word.length : currentLineChars + 1 + word.length;

    if (nextLineChars <= charsPerLine) {
      currentLineChars = nextLineChars;
      continue;
    }

    if (word.length > charsPerLine) {
      if (currentLineChars > 0) {
        lines++;
      }
      lines += Math.ceil(word.length / charsPerLine) - 1;
      currentLineChars = word.length % charsPerLine || charsPerLine;
      continue;
    }

    lines++;
    currentLineChars = word.length;
  }

  return lines;
}

export function swipeUpMainMenuButtonTextHeightPx(
  text: string | null,
  buttonWidthPx: number,
): number {
  const lineCount = swipeUpMainMenuButtonTextLineCount(text, buttonWidthPx);
  if (lineCount === 0) {
    return 0;
  }

  const lineHeightPx = SwipeUpMainMenuButton.TEXT_FONT_SIZE * 1.2;
  return Math.ceil(lineCount * lineHeightPx);
}

/** Maximum height needed to fit text, padding, text margin, and image. */
export function swipeUpMainMenuButtonMaxContentHeightPx(
  buttonWidthPx: number,
  text: string | null,
): number {
  const textHeightPx = swipeUpMainMenuButtonTextHeightPx(text, buttonWidthPx);
  const textMarginPx =
    textHeightPx > 0 ? SwipeUpMainMenuButton.TEXT_MARGIN_PX : 0;

  return (
    SwipeUpMainMenuButton.PADDING_VERTICAL_PX * 2 +
    textHeightPx +
    textMarginPx +
    swipeUpMainMenuButtonImageSizePx(buttonWidthPx)
  );
}

export function swipeUpMainMenuRowHeightPx(
  viewportWidthPx: number,
  rowItems: readonly SwipeUpMainMenuRowItem[],
): number {
  let maxHeightPx = 0;
  for (const item of rowItems) {
    const buttonWidthPx = resolveSwipeUpMainMenuButtonWidthPx(
      item.width,
      viewportWidthPx,
    );
    maxHeightPx = Math.max(
      maxHeightPx,
      swipeUpMainMenuButtonMaxContentHeightPx(buttonWidthPx, item.text),
    );
  }
  return maxHeightPx;
}

export function swipeUpMainMenuButtonHeightPx(
  buttonWidthPx: number,
  text: string | null,
  minHeight: string,
  rowHeightPx: number,
): number {
  const contentHeightPx = swipeUpMainMenuButtonMaxContentHeightPx(
    buttonWidthPx,
    text,
  );
  const resolvedMinHeightPx = resolveSwipeUpMainMenuButtonMinHeightPx(
    minHeight,
    rowHeightPx,
  );
  return Math.max(resolvedMinHeightPx, contentHeightPx);
}

export function swipeUpMainMenuGridWidthPx(viewportWidthPx: number): number {
  return Math.max(0, viewportWidthPx);
}

export function swipeUpMainMenuGridHeightPx(
  viewportWidthPx: number,
  rowItems: readonly SwipeUpMainMenuRowItem[] = SWIPE_UP_MAIN_MENU_DEFAULT_ROW_ITEMS,
): number {
  return (
    SwipeUpMainMenu.MARGIN_TOP_PX +
    swipeUpMainMenuRowHeightPx(viewportWidthPx, rowItems) +
    SwipeUpMainMenu.MARGIN_BOTTOM_PX
  );
}

/**
 * Positions a main-menu button in the 4-column grid.
 * Item index 0 is the leftmost column; indices increase rightward (LTR order).
 */
export function swipeUpMainMenuButtonPositionPx(
  itemIndex: number,
  viewportWidthPx: number,
): { x: number; y: number } {
  const columnWidthPx = swipeUpMainMenuGridColumnWidthPx(viewportWidthPx);
  const gapPx = SwipeUpMainMenu.GAP_PX;
  const columns = SwipeUpMainMenu.GRID_COLUMNS;
  const columnFromLeft = Math.max(0, Math.min(columns - 1, itemIndex));
  return {
    x:
      SwipeUpMainMenu.MARGIN_SIDE_PX +
      columnFromLeft * (columnWidthPx + gapPx),
    y: SwipeUpMainMenu.MARGIN_TOP_PX,
  };
}
