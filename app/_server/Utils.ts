"use server";

import { type ORSProfile } from "./ors/ORSPathfind";

export type Point = {
    latitude: number;
    longitude: number;
}

export type PathParams = {
    profile: ORSProfile;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number;
    endLongitude: number;
};  