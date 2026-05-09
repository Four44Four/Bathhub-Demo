import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";

/** Nested `options` object on directions POST requests. */
export interface OrsDirectionsCalculateOptions {
  avoid_features?: string[];
  avoid_polygons?: Polygon;
  profile_params?: OrsDirectionsProfileParams;
}

export interface OrsDirectionsProfileParams {
  restrictions?: OrsDirectionsHgvRestrictions;
  surface_quality_known?: boolean;
  track_type?: string;
  smoothness?: string;
  maximum_speed?: number;
}

export interface OrsDirectionsHgvRestrictions {
  height?: number;
  weight?: number;
  length?: number;
  width?: number;
}

/** Leg summary on an ORS directions route (meters / seconds). */
export interface OrsRouteSummary {
  distance: number;
  duration: number;
}

/** Single turn-by-turn step within a segment (ORS JSON / GeoJSON properties). */
export interface OrsRouteStep {
  distance: number;
  duration: number;
  type: number;
  instruction?: string;
  name?: string;
  way_points?: number[];
  exit_number?: number;
}

/** Route section between two consecutive waypoints. */
export interface OrsRouteSegment {
  distance: number;
  duration: number;
  steps: OrsRouteStep[];
}

/**
 * `properties` on each route Feature in GeoJSON directions output
 * (mirrors one JSON `routes[]` element minus encoded geometry).
 */
export interface OrsDirectionsRouteProperties {
  summary?: OrsRouteSummary;
  segments?: OrsRouteSegment[];
  /** Indices into the route geometry coordinate list for each waypoint. */
  way_points?: number[];
}

export type OrsDirectionsRouteFeature = Feature<
  LineString,
  OrsDirectionsRouteProperties
>;

/** Subset of `metadata.query` commonly returned by ORS. */
export interface OrsDirectionsGeoJsonMetadataQuery {
  coordinates?: [number, number][];
  profile?: string;
  preference?: string;
  units?: string;
}

export interface OrsDirectionsGeoJsonMetadataEngine {
  version?: string;
  build_date?: string;
  graph_date?: string;
}

/** Top-level `metadata` on GeoJSON directions responses. */
export interface OrsDirectionsGeoJsonMetadata {
  attribution?: string;
  service?: string;
  timestamp?: number;
  query?: OrsDirectionsGeoJsonMetadataQuery;
  engine?: OrsDirectionsGeoJsonMetadataEngine;
}

/**
 * Body returned by `POST .../directions/{profile}/geojson`
 * (FeatureCollection + ORS `metadata` foreign member).
 */
export interface OrsDirectionsGeoJsonResponse
  extends FeatureCollection<LineString, OrsDirectionsRouteProperties> {
  type: "FeatureCollection";
  features: OrsDirectionsRouteFeature[];
  metadata?: OrsDirectionsGeoJsonMetadata;
}
