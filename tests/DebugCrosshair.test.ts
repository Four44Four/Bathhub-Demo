import { debugCrosshairOpacityFromFadeProgress } from "../app/_client/pure/DebugCrosshair";

describe("debugCrosshairMath", () => {
  test("debugCrosshairOpacityFromFadeProgress", () => {
    expect(debugCrosshairOpacityFromFadeProgress(0)).toBe(1);
    expect(debugCrosshairOpacityFromFadeProgress(1)).toBe(0);
  });
});