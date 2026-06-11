import { BATHROOM_GPKG_FILENAME } from "./LocalDbSchema";

const FILE_HANDLE_DB_NAME = "bathhub_gpkg_backup" as const;
const FILE_HANDLE_STORE = "handles" as const;
const FILE_HANDLE_KEY = "bathroom_cache" as const;

type FileSystemWritableWithTruncate = {
  write: (data: BufferSource) => Promise<void>;
  truncate?: (size: number) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandle = {
  createWritable: () => Promise<FileSystemWritableWithTruncate>;
};

type FileSystemAccessWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandle>;
};

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FILE_HANDLE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredFileHandle(): Promise<FileSystemFileHandle | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_HANDLE_STORE, "readonly");
    const request = tx.objectStore(FILE_HANDLE_STORE).get(FILE_HANDLE_KEY);
    request.onsuccess = () => resolve((request.result as FileSystemFileHandle) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function storeFileHandle(handle: FileSystemFileHandle): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FILE_HANDLE_STORE, "readwrite");
    tx.objectStore(FILE_HANDLE_STORE).put(handle, FILE_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Reads the on-disk .gpkg from a persisted File System Access handle when available. */
export async function readGpkgBytesFromFileHandle(): Promise<Uint8Array | null> {
  const handle = await readStoredFileHandle();
  if (!handle) return null;

  try {
    const file = await (handle as FileSystemFileHandle & {
      getFile: () => Promise<File>;
    }).getFile();
    if (file.size === 0) return null;
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/** Writes GeoPackage bytes to a persisted File System Access handle when available. */
export async function writeGpkgBytesToDiskBackup(bytes: Uint8Array): Promise<void> {
  if (typeof window === "undefined") return;

  const fsWindow = window as FileSystemAccessWindow;
  let handle = await readStoredFileHandle();

  if (!handle && typeof fsWindow.showSaveFilePicker === "function") {
    try {
      handle = await fsWindow.showSaveFilePicker({
        suggestedName: BATHROOM_GPKG_FILENAME,
        types: [
          {
            description: "GeoPackage",
            accept: { "application/geopackage+sqlite3": [".gpkg"] },
          },
        ],
      });
      await storeFileHandle(handle);
    } catch {
      return;
    }
  }

  if (!handle) return;

  const writable = await handle.createWritable();
  await writable.write(new Uint8Array(bytes));
  if (typeof writable.truncate === "function") {
    await writable.truncate(bytes.byteLength);
  }
  await writable.close();
}
