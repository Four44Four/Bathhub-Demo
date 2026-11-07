import {
  CARTO_LIGHT_ALL_TILE_URL_TEMPLATE,
  cartoBasemapTileUrlWithApiKey,
  cartoLightAllBasemapTileUrl,
} from "../app/_client/pure/globe/CartoBasemapTileUrl";
import { Globe as GlobeConsts } from "../app/_client/ComponentConstants";

describe("CartoBasemapTileUrl", () => {
  test("Globe constant matches the pure-module light_all template", () => {
    expect(GlobeConsts.CARTO_LIGHT_ALL_TILE_URL_TEMPLATE).toBe(
      CARTO_LIGHT_ALL_TILE_URL_TEMPLATE,
    );
  });

  test("cartoBasemapTileUrlWithApiKey leaves the template unchanged when key is empty", () => {
    expect(
      cartoBasemapTileUrlWithApiKey(CARTO_LIGHT_ALL_TILE_URL_TEMPLATE, ""),
    ).toBe(CARTO_LIGHT_ALL_TILE_URL_TEMPLATE);
  });

  test("cartoBasemapTileUrlWithApiKey appends an encoded key query param", () => {
    expect(
      cartoBasemapTileUrlWithApiKey(
        CARTO_LIGHT_ALL_TILE_URL_TEMPLATE,
        "cb1_test/key+value",
      ),
    ).toBe(
      `${CARTO_LIGHT_ALL_TILE_URL_TEMPLATE}?key=${encodeURIComponent("cb1_test/key+value")}`,
    );
  });

  test("cartoBasemapTileUrlWithApiKey uses & when the template already has a query", () => {
    expect(
      cartoBasemapTileUrlWithApiKey(
        "https://example.test/tiles/{z}/{x}/{y}.png?r=1",
        "abc",
      ),
    ).toBe("https://example.test/tiles/{z}/{x}/{y}.png?r=1&key=abc");
  });

  test("cartoLightAllBasemapTileUrl builds the authenticated light_all URL", () => {
    expect(cartoLightAllBasemapTileUrl("my-key")).toBe(
      `${CARTO_LIGHT_ALL_TILE_URL_TEMPLATE}?key=my-key`,
    );
  });
});
