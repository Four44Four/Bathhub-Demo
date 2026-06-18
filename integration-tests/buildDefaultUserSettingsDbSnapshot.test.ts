import {
  DEFAULT_USER_SETTINGS_DB_SNAPSHOT_RELATIVE_PATH,
} from "../app/_shared/user-settings/DefaultUserSettingsDbPaths";
import { buildDefaultUserSettingsDbSnapshotFile } from "./defaultUserSettingsDbSnapshotHelpers";

describe("buildDefaultUserSettingsDbSnapshot", () => {
  test("writes the server default user settings DB snapshot", async () => {
    const bytes = await buildDefaultUserSettingsDbSnapshotFile();
    expect(bytes.byteLength).toBeGreaterThan(0);
    console.log(
      `Wrote default user settings DB snapshot to ${DEFAULT_USER_SETTINGS_DB_SNAPSHOT_RELATIVE_PATH} (${bytes.byteLength} bytes).`,
    );
  });
});
