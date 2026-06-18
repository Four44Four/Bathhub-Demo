"use server";

import { OrsDirectionsGeoJsonResponse } from "@/types/ors-directions-geojson";
import { type Point, type PathParams, type Errorable } from "../_shared/Utils";
import * as OrsPathfind from "./ors/ORSPathfind";

export type PathData = {
    points: Array<Point>;
    predictedTimeSeconds: number | undefined;
    predictedDistMeters: number | undefined;
}

export async function getPathBetweenPoints(
    params: PathParams
): Promise<Errorable<PathData>> {
    let geoJsonRes: OrsDirectionsGeoJsonResponse;
    try {
        geoJsonRes = await OrsPathfind.fetchRoutePathGeoJson(params);
        return {
            val: {
                points: OrsPathfind.getPointsGeoJson(geoJsonRes),
                predictedTimeSeconds: OrsPathfind.getPredictedTimeGeoJson(geoJsonRes),
                predictedDistMeters: OrsPathfind.getPredictedDistanceGeoJson(geoJsonRes)
            }
        };
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : typeof error === "object" &&
                    error !== null &&
                    "response" in error &&
                    typeof (error as { response?: { data?: unknown } }).response?.data ===
                      "string"
                  ? (error as { response: { data: string } }).response.data
                  : String(error);
        return {
          val: null,
          errorMsg: `Error occurred while calculating route: ${message}`
        }
    }
}