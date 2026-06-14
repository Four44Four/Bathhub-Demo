"use client";

import { useLayoutEffect, useRef, useState } from "react";

import {
  truncateTextTailToFitWidthPx,
  userSettingsBreadcrumbPlainText,
  userSettingsBreadcrumbSegmentsWidthPx,
} from "@/app/_client/pure/user-settings/UserSettingsBreadcrumbDisplay";
import { TextWeight } from "../Utils";
import {
  USER_SETTINGS_HEADER_FONT_SIZE_PX,
  USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX,
  USER_SETTINGS_HEADER_SEPARATOR_COLOR,
  USER_SETTINGS_HEADER_TEXT_COLOR,
} from "./UserSettingsConstants";

export type SettingsHeaderProps = {
  segments: string[];
};

const headerStyle = {
  margin: 0,
  padding: `20px ${USER_SETTINGS_HEADER_HORIZONTAL_PADDING_PX}px 12px`,
  fontSize: USER_SETTINGS_HEADER_FONT_SIZE_PX,
  lineHeight: 1.2,
  color: USER_SETTINGS_HEADER_TEXT_COLOR,
  textAlign: "left" as const,
  overflow: "hidden",
  whiteSpace: "nowrap" as const,
};

function BreadcrumbSegments({ segments }: { segments: string[] }) {
  return (
    <>
      {segments.map((segment, index) => (
        <span key={`${index}-${segment}`}>
          {index > 0 ? (
            <>
              {" "}
              <span style={{ color: USER_SETTINGS_HEADER_SEPARATOR_COLOR }}>
                {">"}
              </span>
              {" "}
            </>
          ) : null}
          {segment}
        </span>
      ))}
    </>
  );
}

export function SettingsHeader({ segments }: SettingsHeaderProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [truncatedText, setTruncatedText] = useState<string | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measurer = measureRef.current;
    if (!container || !measurer) {
      return;
    }

    const measureTextPx = (text: string) => {
      measurer.textContent = text;
      return measurer.getBoundingClientRect().width;
    };

    const updateTruncation = () => {
      const availableWidthPx = container.clientWidth;
      if (availableWidthPx <= 0) {
        setTruncatedText(null);
        return;
      }

      const plainText = userSettingsBreadcrumbPlainText(segments);
      const fullWidthPx = userSettingsBreadcrumbSegmentsWidthPx(
        segments,
        measureTextPx,
        measureTextPx,
      );

      if (fullWidthPx <= availableWidthPx) {
        setTruncatedText(null);
        return;
      }

      setTruncatedText(
        truncateTextTailToFitWidthPx(
          plainText,
          availableWidthPx,
          measureTextPx,
        ),
      );
    };

    updateTruncation();

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(container);
    return () => observer.disconnect();
  }, [segments]);

  return (
    <>
      <span
        ref={measureRef}
        aria-hidden
        className={TextWeight.BOLD}
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          fontSize: USER_SETTINGS_HEADER_FONT_SIZE_PX,
          lineHeight: 1.2,
        }}
      />
      <h1 ref={containerRef} className={TextWeight.BOLD} style={headerStyle}>
        {truncatedText != null ? truncatedText : <BreadcrumbSegments segments={segments} />}
      </h1>
    </>
  );
}
