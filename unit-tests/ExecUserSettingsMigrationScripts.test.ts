import {
  execUserSettingsMigrationScripts,
  stripUserSettingsMigrationTransactionBoundaries,
} from "../app/_shared/user-settings/execUserSettingsMigrationScripts";

describe("stripUserSettingsMigrationTransactionBoundaries", () => {
  test("removes BEGIN, COMMIT, and ROLLBACK entries", () => {
    expect(
      stripUserSettingsMigrationTransactionBoundaries([
        "BEGIN;",
        "CREATE TABLE t (id INTEGER);",
        "COMMIT;",
        "ROLLBACK;",
      ]),
    ).toEqual(["CREATE TABLE t (id INTEGER);"]);
  });
});

describe("execUserSettingsMigrationScripts", () => {
  test("commits when every statement succeeds", () => {
    const executed: string[] = [];
    execUserSettingsMigrationScripts((sql) => {
      executed.push(sql);
    }, ["CREATE TABLE t (id INTEGER);", "INSERT INTO t VALUES (1);"]);

    expect(executed).toEqual([
      "BEGIN",
      "CREATE TABLE t (id INTEGER);",
      "INSERT INTO t VALUES (1);",
      "COMMIT",
    ]);
  });

  test("rolls back and rethrows when a statement fails", () => {
    const executed: string[] = [];
    expect(() =>
      execUserSettingsMigrationScripts((sql) => {
        executed.push(sql);
        if (sql.startsWith("INSERT")) {
          throw new Error("insert failed");
        }
      }, ["CREATE TABLE t (id INTEGER);", "INSERT INTO t VALUES (1);"]),
    ).toThrow("insert failed");

    expect(executed).toEqual([
      "BEGIN",
      "CREATE TABLE t (id INTEGER);",
      "INSERT INTO t VALUES (1);",
      "ROLLBACK",
    ]);
  });

  test("ignores legacy BEGIN/COMMIT entries embedded in migration arrays", () => {
    const executed: string[] = [];
    execUserSettingsMigrationScripts((sql) => {
      executed.push(sql);
    }, ["BEGIN;", "CREATE TABLE t (id INTEGER);", "COMMIT;"]);

    expect(executed).toEqual(["BEGIN", "CREATE TABLE t (id INTEGER);", "COMMIT"]);
  });
});
