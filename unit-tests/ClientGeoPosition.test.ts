import {
  clientGeoPositionsClose,
  isUnsetClientGeoPosition,
} from "../app/_client/pure/globe/ClientGeoPosition";

describe("ClientGeoPosition", () => {
  test("isUnsetClientGeoPosition detects default sentinel", () => {
    expect(isUnsetClientGeoPosition(0, 0)).toBe(true);
    expect(isUnsetClientGeoPosition(1, 0)).toBe(false);
    expect(isUnsetClientGeoPosition(0, 1)).toBe(false);
  });

  test("clientGeoPositionsClose compares within epsilon", () => {
    expect(clientGeoPositionsClose({ lat: 1, lng: 2 }, { lat: 1.0001, lng: 2.0001 })).toBe(
      true,
    );
    expect(clientGeoPositionsClose({ lat: 1, lng: 2 }, { lat: 1.01, lng: 2 })).toBe(false);
  });
});
