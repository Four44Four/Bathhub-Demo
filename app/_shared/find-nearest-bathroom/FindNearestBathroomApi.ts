import { type LatLong } from "../BathroomDataPrimary";
import { type Errorable } from "../Utils";

export const FIND_NEAREST_BATHROOM_API_PATH = "/api/find-nearest-bathroom";

export type FindNearestBathroomConstraints = {
  maxDistanceM: number;
  minRating: number;
};

export type FindNearestBathroomTarget = {
  id: number;
  latitude: number;
  longitude: number;
};

export type FindNearestBathroomRequestBody = {
  location: LatLong;
  constraints: FindNearestBathroomConstraints;
};

export type FindNearestBathroomApiResponse = Errorable<FindNearestBathroomTarget | null>;
