import {
  pathUpdateErrorBandMessage,
  resolvePathUpdateRequestOutcome,
  shouldShowPathUpdateErrorBand,
} from "../app/_client/pure/viewport2d/ResolvePathUpdateRequest";

describe("ResolvePathUpdateRequest", () => {
  test("resolvePathUpdateRequestOutcome classifies timeout, error, and success", () => {
    expect(resolvePathUpdateRequestOutcome("timeout")).toEqual({
      kind: "failure",
      reason: "timeout",
    });
    expect(resolvePathUpdateRequestOutcome("error")).toEqual({
      kind: "failure",
      reason: "error",
    });
    expect(
      resolvePathUpdateRequestOutcome({
        val: {
          points: [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 1 },
          ],
        },
      }),
    ).toEqual({
      kind: "success",
      points: [
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1 },
      ],
    });
  });

  test("resolvePathUpdateRequestOutcome treats unusable path data as error", () => {
    expect(resolvePathUpdateRequestOutcome({ val: null, errorMsg: "failed" })).toEqual({
      kind: "failure",
      reason: "error",
    });
    expect(
      resolvePathUpdateRequestOutcome({
        val: { points: [{ latitude: 0, longitude: 0 }] },
      }),
    ).toEqual({
      kind: "failure",
      reason: "error",
    });
  });

  test("pathUpdateErrorBandMessage selects the configured copy", () => {
    expect(
      pathUpdateErrorBandMessage("error", "Error while updating path", "Timed out"),
    ).toBe("Error while updating path");
    expect(
      pathUpdateErrorBandMessage("timeout", "Error while updating path", "Timed out"),
    ).toBe("Timed out");
  });

  test("shouldShowPathUpdateErrorBand is true for any fetch failure", () => {
    expect(
      shouldShowPathUpdateErrorBand({
        kind: "failure",
        reason: "timeout",
      }),
    ).toBe(true);
    expect(
      shouldShowPathUpdateErrorBand({
        kind: "failure",
        reason: "error",
      }),
    ).toBe(true);
    expect(
      shouldShowPathUpdateErrorBand({
        kind: "success",
        points: [
          { latitude: 0, longitude: 0 },
          { latitude: 1, longitude: 1 },
        ],
      }),
    ).toBe(false);
  });
});
