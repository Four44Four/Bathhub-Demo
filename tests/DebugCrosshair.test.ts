import { debugCrosshairOpacityFromFadeProgress, linearProgress01 } from "../app/_client/globe/pure/DebugCrosshair";

describe("debugCrosshairMath", () => {
  test("linearProgress01", () => {
    expect(linearProgress01(250, 500)).toBe(0.5);
    expect(linearProgress01(600, 500)).toBe(1);
  });

  test("debugCrosshairOpacityFromFadeProgress", () => {
    expect(debugCrosshairOpacityFromFadeProgress(0)).toBe(1);
    expect(debugCrosshairOpacityFromFadeProgress(1)).toBe(0);
  });
});