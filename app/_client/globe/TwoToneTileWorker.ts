import { recolorRgbaInPlace, type TwoTonePalette } from "../pure/TwoToneTileRecolor";

type RecolorRequest = {
  id: number;
  bitmap: ImageBitmap;
  palette: TwoTonePalette;
};

type RecolorResponse =
  | { id: number; bitmap: ImageBitmap }
  | { id: number; error: string };

self.onmessage = async (event: MessageEvent<RecolorRequest>) => {
  const { id, bitmap, palette } = event.data;
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      const err: RecolorResponse = { id, error: "OffscreenCanvas 2d unavailable" };
      self.postMessage(err);
      return;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imgData = ctx.getImageData(0, 0, width, height);
    recolorRgbaInPlace(imgData.data, width, height, palette);
    ctx.putImageData(imgData, 0, 0);

    const out = await createImageBitmap(canvas);
    const msg: RecolorResponse = { id, bitmap: out };
    self.postMessage(msg, { transfer: [out] });
  } catch (e) {
    try {
      bitmap.close();
    } catch {
      // ignore
    }
    const msg: RecolorResponse = {
      id,
      error: e instanceof Error ? e.message : "tile recolor failed",
    };
    self.postMessage(msg);
  }
};
