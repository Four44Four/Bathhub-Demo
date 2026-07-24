import { bathroomInformationLabel } from "../app/_client/pure/bathroom/BathroomInformation";

describe("bathroomInformationLabel", () => {
  test("formats verified and pending bathrooms", () => {
    expect(bathroomInformationLabel(0, "verified")).toBe("0 verified");
    expect(bathroomInformationLabel(42, "pending")).toBe("42 pending-verify");
  });
});
