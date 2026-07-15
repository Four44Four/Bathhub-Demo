import {
  monoIconBakedBillboardTint,
  resolveMonoIconBillboardImage,
} from "../app/_client/pure/svg/ResolveMonoIconBillboardImage";

describe("resolveMonoIconBillboardImage", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("returns non-svg paths unchanged", async () => {
    await expect(
      resolveMonoIconBillboardImage("/marker.png", "baked", "#E4E4FF"),
    ).resolves.toBe("/marker.png");
  });

  test("bakes target color into svg data url", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: async () => '<svg><path fill="#000000" /></svg>',
    }) as typeof fetch;

    const url = await resolveMonoIconBillboardImage(
      "/icon.svg",
      "baked",
      "#E4E4FF",
    );
    expect(url.startsWith("data:image/svg+xml,")).toBe(true);
    expect(decodeURIComponent(url.slice("data:image/svg+xml,".length))).toBe(
      '<svg><path fill="#E4E4FF" /></svg>',
    );
  });

  test("tint mode bakes white base", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: async () => '<svg><path fill="black" /></svg>',
    }) as typeof fetch;

    const url = await resolveMonoIconBillboardImage(
      "/icon.svg",
      "tint",
      "#FF0000",
    );
    expect(decodeURIComponent(url.slice("data:image/svg+xml,".length))).toBe(
      '<svg><path fill="#FFFFFF" /></svg>',
    );
  });
});

describe("monoIconBakedBillboardTint", () => {
  test("uses white identity tint", () => {
    expect(monoIconBakedBillboardTint(0.8)).toEqual({
      color: "#FFFFFF",
      opacity: 0.8,
    });
  });
});
