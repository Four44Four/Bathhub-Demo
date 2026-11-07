"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";

import { BathroomPage as BathroomPageConsts } from "../ComponentConstants";
import {
  commentInputFontHeightPx,
  commentInputHeightPx,
  commentInputScrollTopPx,
} from "../pure/bathroom/CommentInputLayout";

function measureCommentCaretTopPx(textarea: HTMLTextAreaElement): number {
  const caretIndex = textarea.selectionStart ?? textarea.value.length;
  const mirror = document.createElement("div");
  const computed = window.getComputedStyle(textarea);
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.font = computed.font;
  mirror.style.lineHeight = computed.lineHeight;
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.style.boxSizing = computed.boxSizing;
  mirror.textContent = textarea.value.slice(0, caretIndex);
  document.body.appendChild(mirror);
  const caretTopPx = mirror.offsetHeight;
  mirror.remove();
  return caretTopPx;
}

/** Rating comment field that grows up to five lines, then scrolls to the caret. */
export function BathroomCommentInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontHeightPx = commentInputFontHeightPx(
    BathroomPageConsts.COMMENT_INPUT_FONT_SIZE_PX,
    BathroomPageConsts.COMMENT_INPUT_LINE_HEIGHT,
  );
  const minHeightPx =
    fontHeightPx * BathroomPageConsts.COMMENT_INPUT_MIN_HEIGHT_MULTIPLIER;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea == null) {
      return;
    }

    textarea.style.height = "0px";
    const next = commentInputHeightPx({
      contentScrollHeightPx: textarea.scrollHeight,
      fontHeightPx,
      minMultiplier: BathroomPageConsts.COMMENT_INPUT_MIN_HEIGHT_MULTIPLIER,
      maxMultiplier: BathroomPageConsts.COMMENT_INPUT_MAX_HEIGHT_MULTIPLIER,
    });
    textarea.style.height = `${next.heightPx}px`;
    if (!next.scrollable) {
      textarea.scrollTop = 0;
      return;
    }
    const caretTopPx = measureCommentCaretTopPx(textarea);
    textarea.scrollTop = commentInputScrollTopPx({
      caretTopPx,
      clientHeightPx: textarea.clientHeight,
      scrollTopPx: textarea.scrollTop,
    });
  }, [fontHeightPx, value]);

  const style: CSSProperties = {
    width: "100%",
    minHeight: minHeightPx,
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
    resize: "none",
    overflowY: "auto",
    borderRadius: BathroomPageConsts.COMMENT_INPUT_CORNER_RADIUS_PX,
    border: `${BathroomPageConsts.COMMENT_INPUT_BORDER_WIDTH_PX}px solid ${BathroomPageConsts.TEXT_COLOR}`,
    backgroundColor: BathroomPageConsts.BUTTON_FILL_COLOR,
    color: BathroomPageConsts.TEXT_COLOR,
    fontSize: BathroomPageConsts.COMMENT_INPUT_FONT_SIZE_PX,
    lineHeight: BathroomPageConsts.COMMENT_INPUT_LINE_HEIGHT,
    fontFamily: "inherit",
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      disabled={disabled}
      aria-label="Rating comment"
      style={style}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
