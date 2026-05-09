import { type ORSProfile } from "../_server/ors/ORSPathfind";

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

export interface Errorable<T> {
    val: T | null;
    errorMsg?: string;
}