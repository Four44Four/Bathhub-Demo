import {
  parsePostgrestRpcErrorMessage,
  parsePostgrestRpcRow,
} from "../app/_server/pure/postgrest/PostgrestRpc";

describe("PostgREST RPC payloads", () => {
  test("parsePostgrestRpcErrorMessage prefers the PostgREST message", () => {
    expect(
      parsePostgrestRpcErrorMessage(
        { message: "account required", code: "P0001" },
        "Bad Request",
      ),
    ).toBe("account required");
    expect(parsePostgrestRpcErrorMessage(null, "Bad Request")).toBe(
      "Bad Request",
    );
  });

  test("parsePostgrestRpcRow returns the first row of an array payload", () => {
    expect(parsePostgrestRpcRow<{ id: number }>([{ id: 4 }, { id: 5 }])).toEqual({
      id: 4,
    });
    expect(parsePostgrestRpcRow([])).toBeNull();
    expect(parsePostgrestRpcRow({ id: 9 })).toEqual({ id: 9 });
  });
});
