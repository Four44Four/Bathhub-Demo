import {
  bathroomExistenceValueFromRow,
  bathroomExistenceVoteBarFillRatio,
  bathroomInformationLabel,
  bathroomInformationPanelArrowRotationDeg,
  bathroomInformationPanelArrowRowHeightPx,
  bathroomInformationPanelBodyClipHeightPx,
  bathroomInformationPanelBodyHeightPx,
  bathroomInformationPanelDropShadowPaddingPx,
  bathroomInformationPanelExpandedContentShadowInset,
  bathroomInformationPanelExpandedContentOpacity,
  bathroomInformationPanelIconColor,
  bathroomInformationPanelIconPath,
  bathroomInformationPanelIconShouldHighlight,
} from "../app/_client/pure/bathroom/BathroomInformation";

describe("bathroomInformationLabel", () => {
  test("formats verified and pending bathrooms", () => {
    expect(bathroomInformationLabel(0, "verified")).toBe("0 verified");
    expect(bathroomInformationLabel(42, "pending")).toBe("42 pending-verify");
  });
});

describe("bathroomInformationPanelIconColor", () => {
  test("uses verified, non-verified, and pending-deletion colors from the spec", () => {
    expect(bathroomInformationPanelIconColor("verified")).toBe("#6EDCB9");
    expect(bathroomInformationPanelIconColor("pending")).toBe("#DCA36E");
    expect(bathroomInformationPanelIconColor("pending-deletion")).toBe("#DB6F81");
  });
});

describe("bathroomInformationPanelIconPath", () => {
  test("uses verified, non-verified, and pending-deletion bathroom icons from the spec", () => {
    expect(bathroomInformationPanelIconPath("verified")).toBe(
      "/bathhub_bathroom.svg",
    );
    expect(bathroomInformationPanelIconPath("pending")).toBe(
      "/bathhub_bathroom_non_verified.svg",
    );
    expect(bathroomInformationPanelIconPath("pending-deletion")).toBe(
      "/bathhub_bathroom_pending_deletion.svg",
    );
  });
});

describe("bathroomExistenceValueFromRow", () => {
  test("maps bathroom_data_primary existence_value to the panel value", () => {
    expect(
      bathroomExistenceValueFromRow({
        existence_value: 2,
      }),
    ).toBe(2);
  });
});

describe("bathroomExistenceVoteBarFillRatio", () => {
  test("maps existence_value across the deletion-threshold span", () => {
    expect(bathroomExistenceVoteBarFillRatio(0)).toBe(0.5);
    expect(bathroomExistenceVoteBarFillRatio(-10)).toBe(0);
    expect(bathroomExistenceVoteBarFillRatio(10)).toBe(1);
    expect(bathroomExistenceVoteBarFillRatio(-5)).toBe(0.25);
  });
});

describe("bathroomInformationPanelBodyHeightPx", () => {
  test("is zero while collapsed", () => {
    expect(bathroomInformationPanelBodyHeightPx(0, 120)).toBe(0);
  });

  test("reaches the expanded content height when fully open", () => {
    expect(bathroomInformationPanelBodyHeightPx(1, 120)).toBe(120);
  });

  test("interpolates smoothly between collapsed and expanded heights", () => {
    const mid = bathroomInformationPanelBodyHeightPx(0.5, 120);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(120);
  });
});

describe("bathroomInformationPanelBodyClipHeightPx", () => {
  test("adds drop-shadow padding to the expanded clip height", () => {
    const shadowPaddingPx = bathroomInformationPanelDropShadowPaddingPx();
    expect(bathroomInformationPanelBodyClipHeightPx(1, 120)).toBe(
      120 + shadowPaddingPx,
    );
    expect(bathroomInformationPanelBodyClipHeightPx(0, 120)).toBe(0);
  });
});

describe("bathroomInformationPanelExpandedContentShadowInset", () => {
  test("bleeds the body clip into the panel side padding for drop shadows", () => {
    expect(
      bathroomInformationPanelExpandedContentShadowInset(10),
    ).toEqual({
      paddingBottomPx: 10,
      paddingLeftPx: 10,
      paddingRightPx: 10,
      bodyClipMarginLeftPx: -10,
      bodyClipMarginRightPx: -10,
    });
  });

  test("limits horizontal bleed to the available panel padding", () => {
    expect(
      bathroomInformationPanelExpandedContentShadowInset(6),
    ).toEqual({
      paddingBottomPx: 10,
      paddingLeftPx: 6,
      paddingRightPx: 6,
      bodyClipMarginLeftPx: -6,
      bodyClipMarginRightPx: -6,
    });
  });
});

describe("bathroomInformationPanelArrowRowHeightPx", () => {
  test("matches the spec arrow row height", () => {
    expect(bathroomInformationPanelArrowRowHeightPx()).toBe(15);
  });
});

describe("bathroomInformationPanelArrowRotationDeg", () => {
  test("points down when collapsed and up when expanded", () => {
    expect(bathroomInformationPanelArrowRotationDeg(0)).toBe(90);
    expect(bathroomInformationPanelArrowRotationDeg(1)).toBe(-90);
  });

  test("eases rotation with quadratic easing", () => {
    expect(bathroomInformationPanelArrowRotationDeg(0.5)).toBe(0);
  });
});

describe("bathroom information panel expanded content fade", () => {
  test("fades expanded content linearly", () => {
    expect(bathroomInformationPanelExpandedContentOpacity(0)).toBe(0);
    expect(bathroomInformationPanelExpandedContentOpacity(1)).toBe(1);
    expect(bathroomInformationPanelExpandedContentOpacity(0.25)).toBe(0.25);
  });
});

describe("bathroomInformationPanelIconShouldHighlight", () => {
  test("darkens the icon for panel hover but not vote-button hover", () => {
    expect(bathroomInformationPanelIconShouldHighlight(true, false)).toBe(true);
    expect(bathroomInformationPanelIconShouldHighlight(true, true)).toBe(false);
    expect(bathroomInformationPanelIconShouldHighlight(false, false)).toBe(
      false,
    );
  });
});
