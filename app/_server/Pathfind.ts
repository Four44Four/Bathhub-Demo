"use server";

import { type Point, type PathParams } from "./Utils";
import * as OrsPathfind from "./ors/ORSPathfind";

export type PathData = {
    points: Array<Point>;
    predictedTimeSeconds: number | undefined;
    predictedDistMeters: number | undefined;
}

export async function getPathBetweenPoints(
    params: PathParams
): Promise<PathData> {
    const geoJsonRes = await OrsPathfind.fetchRoutePathGeoJson(params);
    return {
        points: OrsPathfind.getPointsGeoJson(geoJsonRes),
        predictedTimeSeconds: OrsPathfind.getPredictedTimeGeoJson(geoJsonRes),
        predictedDistMeters: OrsPathfind.getPredictedDistanceGeoJson(geoJsonRes)
    };
}