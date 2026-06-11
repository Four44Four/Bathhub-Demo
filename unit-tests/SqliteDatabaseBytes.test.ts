import { isSqliteDatabaseBytes } from "../app/_client/pure/bathroom/SqliteDatabaseBytes";

describe("SqliteDatabaseBytes", () => {
  test("isSqliteDatabaseBytes recognizes the SQLite file header", () => {
    const header = new TextEncoder().encode("SQLite format 3\u0000");
    expect(isSqliteDatabaseBytes(header)).toBe(true);
    expect(isSqliteDatabaseBytes(new Uint8Array([1, 2, 3]))).toBe(false);
    expect(isSqliteDatabaseBytes(new Uint8Array())).toBe(false);
  });
});
