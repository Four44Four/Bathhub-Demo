import { USER_SETTINGS_DB_FILENAME } from "../UserSettingsDbSchema";

/** Reads the on-disk user-settings SQLite DB from OPFS. */
export async function readUserSettingsDbBytesFromOpfs(
  filename: string = USER_SETTINGS_DB_FILENAME,
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

export async function deleteUserSettingsDbFromOpfs(
  filename: string = USER_SETTINGS_DB_FILENAME,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return;
  }

  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(filename);
  } catch {
    // Missing file or unsupported OPFS.
  }
}

type FileSystemWritableFileStreamWithTruncate = FileSystemWritableFileStream & {
  truncate?: (size: number) => Promise<void>;
};

export async function writeUserSettingsDbBytesToOpfs(
  bytes: Uint8Array,
  filename: string = USER_SETTINGS_DB_FILENAME,
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
