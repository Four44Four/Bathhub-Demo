export type VerifyStatus = "pending" | "verified";

export type LatLong = {
  latitude: number;
  longitude: number;
};

export type ViewportBounds = {
  lowerLeft: LatLong;
  upperRight: LatLong;
};

export type BathroomDataPrimaryRow = {
  id: number;
  latitude: number;
  longitude: number;
  verify_status: VerifyStatus;
  temp_data: string;
  created_at: string;
};
