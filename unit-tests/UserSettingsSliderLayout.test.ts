import {
  booleanToggleKnobOffsetPx,
  numberSliderAccentFillWidthPx,
  numberSliderKnobCenterPx,
  numberSliderValueRatio,
} from "../app/_client/pure/user-settings/UserSettingsSliderLayout";

describe("UserSettingsSliderLayout", () => {
  test("numberSliderValueRatio clamps and normalizes", () => {
    expect(numberSliderValueRatio(5, 0, 10)).toBe(0.5);
    expect(numberSliderValueRatio(-1, 0, 10)).toBe(0);
    expect(numberSliderValueRatio(12, 0, 10)).toBe(1);
    expect(numberSliderValueRatio(5, 5, 5)).toBe(0);
  });

  test("numberSliderKnobCenterPx spans the track travel", () => {
    expect(numberSliderKnobCenterPx(0, 100, 20)).toBe(10);
    expect(numberSliderKnobCenterPx(1, 100, 20)).toBe(90);
  });

  test("numberSliderAccentFillWidthPx matches knob center", () => {
    expect(numberSliderAccentFillWidthPx(42)).toBe(42);
  });

  test("booleanToggleKnobOffsetPx moves between padded ends", () => {
    expect(booleanToggleKnobOffsetPx(false, 44, 20, 2)).toBe(2);
    expect(booleanToggleKnobOffsetPx(true, 44, 20, 2)).toBe(22);
  });
});
