import {
  INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT,
  INCREMENT_BATHROOM_EXISTENCE_VOTE_INVALID_ID_MESSAGE,
  buildIncrementBathroomExistenceVoteRpcParams,
  bathroomExistenceVoteSideToRpcFlag,
  incrementBathroomExistenceVote,
  incrementBathroomExistenceVoteValidationError,
} from "../app/_server/pure/bathroom-data-primary/IncrementBathroomExistenceVote";
import { type BathroomDataPrimaryFullRow } from "../app/_shared/BathroomDataPrimary";

const sampleRow: BathroomDataPrimaryFullRow = {
  id: 42,
  latitude: 45.5,
  longitude: -73.6,
  existence_value: 2,
  deletion_wait_started_timestamp: null,
  temp_data: "a".repeat(64),
  created_at: "2026-06-09T00:00:00.000Z",
  version: 3,
  rating_1_count: 0,
  rating_2_count: 0,
  rating_3_count: 0,
  rating_4_count: 1,
  rating_5_count: 0,
};

describe("IncrementBathroomExistenceVote pure logic", () => {
  test("incrementBathroomExistenceVoteValidationError rejects invalid ids", () => {
    expect(incrementBathroomExistenceVoteValidationError(0)).toBe(
      INCREMENT_BATHROOM_EXISTENCE_VOTE_INVALID_ID_MESSAGE,
    );
    expect(incrementBathroomExistenceVoteValidationError(1.5)).toBe(
      INCREMENT_BATHROOM_EXISTENCE_VOTE_INVALID_ID_MESSAGE,
    );
    expect(incrementBathroomExistenceVoteValidationError(1)).toBeNull();
  });

  test("bathroomExistenceVoteSideToRpcFlag maps vote sides", () => {
    expect(bathroomExistenceVoteSideToRpcFlag("exists")).toBe(true);
    expect(bathroomExistenceVoteSideToRpcFlag("not_exists")).toBe(false);
  });

  test("buildIncrementBathroomExistenceVoteRpcParams maps id and side", () => {
    expect(buildIncrementBathroomExistenceVoteRpcParams(42, "exists")).toEqual({
      p_id: 42,
      p_vote_for_exists: true,
    });
    expect(
      buildIncrementBathroomExistenceVoteRpcParams(42, "not_exists"),
    ).toEqual({
      p_id: 42,
      p_vote_for_exists: false,
    });
  });
});

describe("incrementBathroomExistenceVote", () => {
  test("returns the RPC row on success", async () => {
    await expect(
      incrementBathroomExistenceVote(42, "exists", async () => ({
        data: sampleRow,
        error: null,
      })),
    ).resolves.toEqual(sampleRow);
  });

  test("passes validated increment params to the RPC", async () => {
    let receivedParams:
      | {
          p_id: number;
          p_vote_for_exists: boolean;
        }
      | undefined;

    await incrementBathroomExistenceVote(7, "not_exists", async (params) => {
      receivedParams = params;
      return { data: sampleRow, error: null };
    });

    expect(receivedParams).toEqual({
      p_id: 7,
      p_vote_for_exists: false,
    });
  });

  test("throws a formatted validation error before calling RPC", async () => {
    const rpc = jest.fn();

    await expect(incrementBathroomExistenceVote(0, "exists", rpc)).rejects.toThrow(
      `${INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT}: ${INCREMENT_BATHROOM_EXISTENCE_VOTE_INVALID_ID_MESSAGE}`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  test("throws a formatted error when the RPC fails", async () => {
    await expect(
      incrementBathroomExistenceVote(42, "exists", async () => ({
        data: null,
        error: { message: "row not found" },
      })),
    ).rejects.toThrow(
      `${INCREMENT_BATHROOM_EXISTENCE_VOTE_ERROR_CONTEXT}: row not found`,
    );
  });
});
