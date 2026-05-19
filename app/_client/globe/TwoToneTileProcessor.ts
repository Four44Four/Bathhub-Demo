import {
  recolorRgbaInPlace,
  twoTonePaletteFromRgb,
  type TwoTonePalette,
} from "../pure/globe/TwoToneTileRecolor";

/** Rows processed per main-thread chunk before yielding (keeps pan/zoom responsive). */
const MAIN_THREAD_ROWS_PER_CHUNK = 8;
/** Yield every N chunks during main-thread fallback. */
const MAIN_THREAD_YIELD_EVERY_CHUNKS = 2;

type PendingJob = {
  resolve: (value: ImageBitmap | HTMLCanvasElement) => void;
  reject: (reason?: unknown) => void;
};

/** Yields so the browser can paint / handle input before more main-thread work. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Offloads two-tone tile recolor to a Web Worker when available; otherwise
 * processes on the main thread in small chunks with yields between batches.
 */
export class TwoToneTileProcessor {
  private readonly palette: TwoTonePalette;
  private worker: Worker | null = null;
  private nextJobId = 0;
  private readonly pending = new Map<number, PendingJob>();
  private workerFailed = false;

  constructor(
    water: { r: number; g: number; b: number },
    land: { r: number; g: number; b: number },
  ) {
    this.palette = twoTonePaletteFromRgb(water, land);
    this.tryInitWorker();
  }

  private tryInitWorker() {
    if (typeof Worker === "undefined" || this.workerFailed) return;
    try {
      const w = new Worker(new URL("./TwoToneTileWorker.ts", import.meta.url));
      w.onmessage = (event: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>) => {
        const { id, bitmap, error } = event.data;
        const job = this.pending.get(id);
        if (!job) return;
        this.pending.delete(id);
        if (bitmap) job.resolve(bitmap);
        else job.reject(new Error(error ?? "tile worker failed"));
      };
      w.onerror = () => {
        this.workerFailed = true;
        this.rejectAllPending(new Error("tile worker error"));
        w.terminate();
        this.worker = null;
      };
      this.worker = w;
    } catch {
      this.worker = null;
    }
  }

  destroy() {
    this.rejectAllPending(new Error("tile processor destroyed"));
    this.worker?.terminate();
    this.worker = null;
  }

  async recolor(image: ImageBitmap | HTMLImageElement): Promise<ImageBitmap | HTMLCanvasElement> {
    if (this.worker && !this.workerFailed) {
      try {
        return await this.recolorViaWorker(image);
      } catch {
        this.workerFailed = true;
        this.worker?.terminate();
        this.worker = null;
      }
    }
    return this.recolorOnMainThreadYielding(image);
  }

  private rejectAllPending(reason: unknown) {
    for (const job of this.pending.values()) {
      job.reject(reason);
    }
    this.pending.clear();
  }

  private async toImageBitmap(image: ImageBitmap | HTMLImageElement): Promise<ImageBitmap> {
    if (image instanceof ImageBitmap) return image;
    if (typeof createImageBitmap !== "function") {
      throw new Error("createImageBitmap unavailable");
    }
    return createImageBitmap(image);
  }

  private recolorViaWorker(image: ImageBitmap | HTMLImageElement): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      void (async () => {
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await this.toImageBitmap(image);
          const id = ++this.nextJobId;
          this.pending.set(id, {
            resolve: (v) => resolve(v as ImageBitmap),
            reject,
          });
          this.worker!.postMessage({ id, bitmap, palette: this.palette }, { transfer: [bitmap] });
        } catch (e) {
          bitmap?.close();
          reject(e);
        }
      })();
    });
  }

  private async recolorOnMainThreadYielding(
    image: ImageBitmap | HTMLImageElement,
  ): Promise<ImageBitmap | HTMLCanvasElement> {
    const width = image.width;
    const height = image.height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return image as ImageBitmap | HTMLCanvasElement;

    ctx.drawImage(image, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);

    let chunkCount = 0;
    for (let row = 0; row < height; row += MAIN_THREAD_ROWS_PER_CHUNK) {
      const rowEnd = Math.min(height, row + MAIN_THREAD_ROWS_PER_CHUNK);
      recolorRgbaInPlace(imgData.data, width, height, this.palette, row, rowEnd);
      chunkCount += 1;
      if (chunkCount % MAIN_THREAD_YIELD_EVERY_CHUNKS === 0) {
        await yieldToMain();
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (typeof createImageBitmap === "function") {
      return createImageBitmap(canvas);
    }
    return canvas;
  }
}
