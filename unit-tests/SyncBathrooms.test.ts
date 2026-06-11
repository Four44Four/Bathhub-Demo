import {
  buildSyncBathroomRpcParams,
  computeBathroomSyncDiff,
  parseSyncBathroomRpcPayload,
} from "../app/_server/pure/bathroom-data-primary/SyncBathrooms";

describe("SyncBathrooms pure logic", () => {
  const remoteRows = [
    {
      id: 1,
      version: 2,
      latitude: 10,
      longitude: 20,
      verify_status: "pending" as const,
    },
    {
      id: 2,
      version: 0,
      latitude: 11,
      longitude: 21,
      verify_status: "verified" as const,
    },
  ];

  test("computeBathroomSyncDiff upserts new and stale rows and deletes missing ids", () => {
    expect(
      computeBathroomSyncDiff(remoteRows, [
        { id: 1, version: 2 },
        { id: 3, version: 0 },
      ]),
    ).toEqual({
      upserts: [
        {
          id: 2,
          latitude: 11,
          longitude: 21,
          verify_status: "verified",
          version: 0,
        },
      ],
      deleteIds: [3],
    });
  });

  test("computeBathroomSyncDiff upserts when cached version is older", () => {
    expect(
      computeBathroomSyncDiff(remoteRows, [{ id: 1, version: 1 }]),
    ).toEqual({
      upserts: [
        {
          id: 1,
          latitude: 10,
          longitude: 20,
          verify_status: "pending",
          version: 2,
        },
        {
          id: 2,
          latitude: 11,
          longitude: 21,
          verify_status: "verified",
          version: 0,
        },
      ],
      deleteIds: [],
    });
  });

  test("buildSyncBathroomRpcParams maps bounds and cache payload", () => {
    expect(
      buildSyncBathroomRpcParams(
        {
          lowerLeft: { latitude: 1, longitude: 2 },
          upperRight: { latitude: 3, longitude: 4 },
        },
        [{ id: 9, version: 1 }],
      ),
    ).toEqual({
      p_min_longitude: 2,
      p_min_latitude: 1,
      p_max_longitude: 4,
      p_max_latitude: 3,
      p_client_cache: [{ id: 9, version: 1 }],
    });
  });

  test("parseSyncBathroomRpcPayload normalizes RPC json", () => {
    expect(
      parseSyncBathroomRpcPayload({
        upserts: [
          {
            id: 5,
            latitude: 1.5,
            longitude: 2.5,
            verify_status: "pending",
            version: 3,
          },
        ],
        delete_ids: [9],
      }),
    ).toEqual({
      upserts: [
        {
          id: 5,
          latitude: 1.5,
          longitude: 2.5,
          verify_status: "pending",
          version: 3,
        },
      ],
      deleteIds: [9],
    });
  });
});
