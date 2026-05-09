declare module "openrouteservice-js" {
  export type OrsDirectionsConstructorArgs = {
    api_key?: string;
    host?: string;
    timeout?: number;
    service?: string;
    api_version?: string;
  };

  /** POST body for `/v2/directions/{profile}` (subset + common fields; see ORS API docs). */
  export type OrsDirectionsCalculateArgs = {
    coordinates: [number, number][];
    profile: string;
    format?: string;
    preference?: string;
    units?: string;
    language?: string;
    geometry?: boolean;
    instructions?: boolean;
    elevation?: boolean;
    extra_info?: string[];
    attributes?: string[];
    maneuvers?: boolean;
    radiuses?: number[];
    bearings?: [number, number][];
    continue_straight?: boolean;
    options?: import("./ors-directions-geojson").OrsDirectionsCalculateOptions;
  };

  export class Directions {
    constructor(args: OrsDirectionsConstructorArgs);
    calculate(
      reqArgs: OrsDirectionsCalculateArgs,
    ): Promise<
      import("./ors-directions-geojson").OrsDirectionsGeoJsonResponse
    >;
  }

  const Openrouteservice: {
    Directions: typeof Directions;
  };

  export default Openrouteservice;
}
