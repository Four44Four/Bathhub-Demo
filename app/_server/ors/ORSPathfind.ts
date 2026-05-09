import "server-only";

import Openrouteservice from "openrouteservice-js";

import type { OrsDirectionsGeoJsonResponse } from "@/types/ors-directions-geojson";

import { type PathParams, type Point } from "../../_shared/Utils";

/** Request timeout for remote OpenRouteService API calls (ms). */
const ORS_TIMEOUT_MS = 5000;

/** Hardcoded response format for directions requests (ORS URL segment + JSON shape). */
const ORS_DIRECTIONS_FORMAT = "geojson" as const;

/** Env var name read for the ORS API key (see `getOpenRouteServiceApiKey`). */
const OPEN_ROUTE_SERVICE_API_KEY_ENV = "OPEN_ROUTE_SERVICE_API_KEY" as const;

export type ORSProfile = "driving-car" | "driving-hgv" | "cycling-regular" | "cycling-mountain" | "cycling-road" | "cycling-electric" | "foot-walking" | "foot-hiking" | "wheelchair";

function getOpenRouteServiceApiKey(): string {
  const key = process.env[OPEN_ROUTE_SERVICE_API_KEY_ENV];
  if (key === undefined || key.length === 0) {
    throw new Error(
      `Missing or empty environment variable ${OPEN_ROUTE_SERVICE_API_KEY_ENV}`,
    );
  }
  return key;
}

/**
 * Creates a Directions client for the public ORS API (`https://api.openrouteservice.org`).
 * Uses `process.env.OPEN_ROUTE_SERVICE_API_KEY` and {@link ORS_TIMEOUT_MS}.
 */
function createOpenRouteDirectionsClient() {
  return new Openrouteservice.Directions({
    api_key: getOpenRouteServiceApiKey(),
    timeout: ORS_TIMEOUT_MS,
  });
}

/** ORS expects each position as [longitude, latitude]. */
function latLngToOrsCoordinate(
  latitude: number,
  longitude: number,
): [number, number] {
  return [longitude, latitude];
}

type FetchDirectionsGeoJsonParams = {
  profile: ORSProfile;
  /** At least two positions: start, end, optional intermediates in order. */
  waypointsLatLng: Array<{ latitude: number; longitude: number }>;
};

/**
 * Calls ORS Directions with `format: "geojson"` and returns the parsed response body.
 * Requires at least two waypoints (origin and destination).
 */
async function fetchDirectionsPathGeoJson(
  params: FetchDirectionsGeoJsonParams,
): Promise<OrsDirectionsGeoJsonResponse> {
  const { profile, waypointsLatLng } = params;

  if (waypointsLatLng.length < 2) {
    throw new Error(
      "fetchDirectionsPathGeoJson requires at least two waypoints (start and end).",
    );
  }

  const directions = createOpenRouteDirectionsClient();

  const coordinates = waypointsLatLng.map((p) =>
    latLngToOrsCoordinate(p.latitude, p.longitude),
  );

  return directions.calculate({
    coordinates,
    profile,
    format: ORS_DIRECTIONS_FORMAT,
  });
}

/**
 * Convenience wrapper: route from one lat/lng to another, GeoJSON response.
 */
export function fetchRoutePathGeoJson(
  params: PathParams,
): Promise<OrsDirectionsGeoJsonResponse> {
  const {
    profile,
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude,
  } = params;

  return fetchDirectionsPathGeoJson({
    profile,
    waypointsLatLng: [
      { latitude: startLatitude, longitude: startLongitude },
      { latitude: endLatitude, longitude: endLongitude },
    ],
  });
}

/*
 * ASSUMPTION FOR BELOW FUNCTIONS
 *   intended route path is always in `geoJson.features[0]`
 */

export function getPointsGeoJson(
  geoJson: OrsDirectionsGeoJsonResponse
): Array<Point> {
  return geoJson.features[0].geometry.coordinates.map(it => {
    return {
      latitude: it[0], 
      longitude: it[1] 
    };
  });
}

// in seconds
export function getPredictedTimeGeoJson(
  geoJson: OrsDirectionsGeoJsonResponse
): number | undefined {
  return geoJson.features[0].properties.summary?.duration;
}

// in meters
export function getPredictedDistanceGeoJson(
  geoJson: OrsDirectionsGeoJsonResponse
): number | undefined {
  return geoJson.features[0].properties.summary?.distance;
}