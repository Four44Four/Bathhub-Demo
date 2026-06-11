import { BATHROOM_GPKG_FILENAME } from "./LocalDbSchema";

/** Reads the on-disk .gpkg from the origin-private file system (OPFS). */
export async function readGpkgBytesFromOpfs(
  filename: string = BATHROOM_GPKG_FILENAME,
): Promise<Uint8Array | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return null;
  }

  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(filename, { create: false });
    const file = await handle.getFile();
    if (file.size === 0) return null;
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

type FileSystemWritableFileStreamWithTruncate = FileSystemWritableFileStream & {
  truncate?: (size: number) => Promise<void>;
};

/** Removes a .gpkg snapshot from OPFS when it is corrupt or unreadable. */
export async function deleteGpkgFromOpfs(
  filename: string = BATHROOM_GPKG_FILENAME,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return;
  }

  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(filename);
  } catch {
    // Missing file or unsupported OPFS — nothing to delete.
  }
}

/** Writes the in-memory GeoPackage snapshot to OPFS as a .gpkg file. */
export async function writeGpkgBytesToOpfs(
  bytes: Uint8Array,
  filename: string = BATHROOM_GPKG_FILENAME,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return;
  }

  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(filename, { create: true });
  const writable = (await handle.createWritable()) as FileSystemWritableFileStreamWithTruncate;
  await writable.write(new Uint8Array(bytes));
  if (typeof writable.truncate === "function") {
    await writable.truncate(bytes.byteLength);
  }
  await writable.close();
}
