import { CircularCloseButton } from "../app/_client/ComponentConstants";

describe("CircularCloseButton constants", () => {
  it("matches circular_close_button.md sizing (18px image, 15px padding, no outline)", () => {
    expect(CircularCloseButton.IMAGE_SIZE_PX).toBe(18);
    expect(CircularCloseButton.PADDING_PX).toBe(15);
    expect(CircularCloseButton.OUTLINE_THICKNESS).toBe(0);
    expect(CircularCloseButton.SIZE_PX).toBe(48);
  });
});
