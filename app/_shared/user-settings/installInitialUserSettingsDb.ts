export type InitialUserSettingsDbInstallResult =
  | { ok: true }
  | { ok: false; reason: "not_applicable" | "fetch_failed" };

export function shouldInstallInitialUserSettingsDbFromServer(
  persistentVersion: number | null,
  hadLocalPersistentDbAtStartup: boolean,
): boolean {
  return persistentVersion == null && !hadLocalPersistentDbAtStartup;
}
