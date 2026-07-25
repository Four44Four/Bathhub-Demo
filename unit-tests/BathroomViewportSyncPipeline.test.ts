import { type BathroomLocalDbPort } from "../app/_client/local-db/LocalDbPort";
import {
  runBathroomViewportLocalSync,
  runBathroomViewportRemoteSync,
  runBathroomViewportSyncPipeline,
} from "../app/_client/pure/bathroom/BathroomViewportSyncPipeline";
import { replaceRenderedBathrooms } from "../app/_client/pure/bathroom/RenderedBathrooms";
import {
  type BathroomSyncResponse,
  type BathroomSyncUpsert,
  type BathroomViewportEntry,
  deriveVerifyStatusFromBathroomFields,
  deriveVerifyStatusFromExistenceValue,
} from "../app/_shared/BathroomDataPrimary";

function viewportEntry(
  overrides: Partial<BathroomViewportEntry> & Pick<BathroomViewportEntry, "id">,
): BathroomViewportEntry {
  const existence_value = overrides.existence_value ?? 0;
  const deletion_wait_started_timestamp =
    overrides.deletion_wait_started_timestamp ?? null;
  return {
    latitude: 0,
    longitude: 0,
    version: 0,
    existence_value,
    deletion_wait_started_timestamp,
    verify_status: deriveVerifyStatusFromBathroomFields(
      existence_value,
      deletion_wait_started_timestamp,
    ),
    ...overrides,
  };
}

function syncUpsert(
  overrides: Partial<BathroomSyncUpsert> & Pick<BathroomSyncUpsert, "id">,
): BathroomSyncUpsert {
  return {
    latitude: 0,
    longitude: 0,
    version: 0,
    existence_value: 0,
    deletion_wait_started_timestamp: null,
    ...overrides,
  };
}

function createLocalDbMock(
  localEntries: BathroomViewportEntry[],
): jest.Mocked<BathroomLocalDbPort> {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    getInBounds: jest.fn().mockResolvedValue(localEntries),
    getIdVersionPairsInBounds: jest
      .fn()
      .mockResolvedValue(localEntries.map(({ id, version }) => ({ id, version }))),
    upsertMany: jest.fn().mockResolvedValue(undefined),
    deleteMany: jest.fn().mockResolvedValue(undefined),
  };
}

function renderedIds(rendered: Map<number, BathroomViewportEntry>): number[] {
  return Array.from(rendered.keys()).sort((a, b) => a - b);
}

describe("BathroomViewportSyncPipeline", () => {
  const bounds = {
    lowerLeft: { latitude: 0, longitude: 0 },
    upperRight: { latitude: 1, longitude: 1 },
  };

  test("keeps local bathrooms rendered when remote sync returns null", async () => {
    const localDbPort = createLocalDbMock([
      viewportEntry({
        id: 7,
        latitude: 0.25,
        longitude: 0.75,
        existence_value: 2,
        version: 2,
      }),
    ]);
    const onRenderedBathroomsChange = jest.fn();
    const onRemoteSyncError = jest.fn();

    await runBathroomViewportSyncPipeline({
      requestId: 1,
      bounds,
      localDbPort,
      isRequestCurrent: () => true,
      syncRemote: async () => ({ val: null, errorMsg: "rpc failed" }),
      onRenderedBathroomsChange,
      onRemoteSyncError,
    });

    expect(onRemoteSyncError).toHaveBeenCalledWith("rpc failed");
    expect(localDbPort.upsertMany).not.toHaveBeenCalled();
    expect(localDbPort.deleteMany).not.toHaveBeenCalled();
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(2);
    expect(renderedIds(onRenderedBathroomsChange.mock.calls[1]![0])).toEqual([7]);
  });

  test("renders local entries before remote sync resolves", async () => {
    let resolveRemote: ((value: { val: BathroomSyncResponse }) => void) | undefined;
    const remotePromise = new Promise<{ val: BathroomSyncResponse }>((resolve) => {
      resolveRemote = resolve;
    });

    const localDbPort = createLocalDbMock([
      viewportEntry({
        id: 1,
        latitude: 0.1,
        longitude: 0.1,
        version: 0,
      }),
    ]);
    const onRenderedBathroomsChange = jest.fn();

    const runPromise = runBathroomViewportSyncPipeline({
      requestId: 4,
      bounds,
      localDbPort,
      isRequestCurrent: () => true,
      syncRemote: async () => remotePromise,
      onRenderedBathroomsChange,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(1);
    expect(renderedIds(onRenderedBathroomsChange.mock.calls[0]![0])).toEqual([1]);

    resolveRemote?.({
      val: {
        upserts: [
          syncUpsert({
            id: 2,
            latitude: 0.2,
            longitude: 0.2,
            existence_value: 2,
            version: 1,
          }),
        ],
        deleteIds: [],
      },
    });

    await runPromise;
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(2);
    expect(renderedIds(onRenderedBathroomsChange.mock.calls[1]![0])).toEqual([1, 2]);
  });

  test("local sync hydrates rendered bathrooms without calling remote", async () => {
    const localDbPort = createLocalDbMock([
      viewportEntry({
        id: 3,
        latitude: 0.3,
        longitude: 0.3,
        existence_value: 2,
        version: 1,
      }),
    ]);
    const onRenderedBathroomsChange = jest.fn();
    const syncRemote = jest.fn();

    const rendered = await runBathroomViewportLocalSync({
      requestId: 8,
      bounds,
      localDbPort,
      isRequestCurrent: () => true,
      onRenderedBathroomsChange,
    });

    expect(rendered).not.toBeNull();
    expect(renderedIds(rendered!)).toEqual([3]);
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(1);
    expect(syncRemote).not.toHaveBeenCalled();
  });

  test("remote sync overrides local rendered state with server upserts", async () => {
    const localDbPort = createLocalDbMock([]);
    const onRenderedBathroomsChange = jest.fn();
    const initialRendered = replaceRenderedBathrooms([
      viewportEntry({
        id: 4,
        latitude: 0.4,
        longitude: 0.4,
        version: 0,
      }),
    ]);

    await runBathroomViewportRemoteSync({
      requestId: 9,
      bounds,
      localDbPort,
      isRequestCurrent: () => true,
      initialRendered,
      syncRemote: async () => ({
        val: {
          upserts: [
            syncUpsert({
              id: 4,
              latitude: 0.41,
              longitude: 0.41,
              existence_value: 2,
              version: 2,
            }),
          ],
          deleteIds: [],
        },
      }),
      onRenderedBathroomsChange,
    });

    expect(localDbPort.upsertMany).toHaveBeenCalledTimes(1);
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(1);
    expect(onRenderedBathroomsChange.mock.calls[0]![0].get(4)?.verify_status).toBe(
      "verified",
    );
    expect(onRenderedBathroomsChange.mock.calls[0]![0].get(4)?.loadedFromCache).toBe(
      false,
    );
  });

  test("local sync after remote fetch preserves loadedFromCache false for debug tint", async () => {
    const remoteFetched = viewportEntry({
      id: 5,
      latitude: 0.5,
      longitude: 0.5,
      existence_value: 2,
      version: 1,
    });
    const localDbPort = createLocalDbMock([remoteFetched]);
    const previousRendered = new Map([
      [
        remoteFetched.id,
        { ...remoteFetched, loadedFromCache: false },
      ],
    ]);
    const onRenderedBathroomsChange = jest.fn();

    const rendered = await runBathroomViewportLocalSync({
      requestId: 10,
      bounds,
      localDbPort,
      isRequestCurrent: () => true,
      onRenderedBathroomsChange,
      previousRendered,
    });

    expect(rendered?.get(5)?.loadedFromCache).toBe(false);
  });

  test("stale remote upsert keeps loadedFromCache true when id was already cached", async () => {
    const localDbPort = createLocalDbMock([
      viewportEntry({
        id: 6,
        latitude: 0.6,
        longitude: 0.6,
        version: 1,
      }),
    ]);
    localDbPort.getIdVersionPairsInBounds.mockResolvedValue([{ id: 6, version: 1 }]);
    const onRenderedBathroomsChange = jest.fn();
    const initialRendered = new Map([
      [
        6,
        {
          ...viewportEntry({
            id: 6,
            latitude: 0.6,
            longitude: 0.6,
            version: 1,
          }),
          loadedFromCache: true,
        },
      ],
    ]);

    await runBathroomViewportRemoteSync({
      requestId: 11,
      bounds,
      localDbPort,
      isRequestCurrent: () => true,
      initialRendered,
      syncRemote: async () => ({
        val: {
          upserts: [
            syncUpsert({
              id: 6,
              latitude: 0.61,
              longitude: 0.61,
              existence_value: 2,
              version: 2,
            }),
          ],
          deleteIds: [],
        },
      }),
      onRenderedBathroomsChange,
    });

    expect(onRenderedBathroomsChange.mock.calls[0]![0].get(6)?.loadedFromCache).toBe(
      true,
    );
    expect(onRenderedBathroomsChange.mock.calls[0]![0].get(6)?.verify_status).toBe(
      "verified",
    );
  });

  test("drops stale requests before applying remote merges", async () => {
    let activeRequestId = 2;
    let resolveRemote: ((value: { val: BathroomSyncResponse }) => void) | undefined;
    const remotePromise = new Promise<{ val: BathroomSyncResponse }>((resolve) => {
      resolveRemote = resolve;
    });

    const localDbPort = createLocalDbMock([
      viewportEntry({
        id: 2,
        latitude: 0.4,
        longitude: 0.4,
        version: 2,
      }),
    ]);
    const onRenderedBathroomsChange = jest.fn();

    const runPromise = runBathroomViewportSyncPipeline({
      requestId: 2,
      bounds,
      localDbPort,
      isRequestCurrent: (requestId) => requestId === activeRequestId,
      syncRemote: async () => remotePromise,
      onRenderedBathroomsChange,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(1);

    activeRequestId = 3;
    resolveRemote?.({
      val: {
        upserts: [
          syncUpsert({
            id: 9,
            latitude: 0.5,
            longitude: 0.5,
            existence_value: 2,
            version: 4,
          }),
        ],
        deleteIds: [],
      },
    });
    await runPromise;

    expect(localDbPort.upsertMany).not.toHaveBeenCalled();
    expect(localDbPort.deleteMany).not.toHaveBeenCalled();
    expect(onRenderedBathroomsChange).toHaveBeenCalledTimes(1);
    expect(renderedIds(onRenderedBathroomsChange.mock.calls[0]![0])).toEqual([2]);
  });
});
