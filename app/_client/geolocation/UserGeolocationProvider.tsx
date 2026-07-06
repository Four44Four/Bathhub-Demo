"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import {
  DEFAULT_CLIENT_GEO,
  patchClientGeoRef,
  useClientGeoRef,
  usePatchClientGeo,
} from "../globe/ClientGeoContext";
import type { GeoLatLon } from "../pure/globe/UserGeolocationCalculator";
import {
  createUserGeolocationTracker,
  type UserGeolocationTracker,
} from "./UserGeolocationTracker";
export type { GeoLatLon } from "../pure/globe/UserGeolocationCalculator";

export type UserGeolocationGlobeHandlers = {
  onUserGeoFix?: (lat: number, lng: number) => void;
  onUserGeoRevoked?: () => void;
};

type UserGeolocationContextValue = {
  seedUserPosition: (position: GeoLatLon, accuracyMeters?: number) => void;
  getUserGeoPosition: () => GeoLatLon | null;
  registerGlobeGeoHandlers: (handlers: UserGeolocationGlobeHandlers | null) => void;
};

const UserGeolocationContext = createContext<UserGeolocationContextValue | null>(null);

export type UserGeolocationProviderProps = {
  children: ReactNode;
};

export function UserGeolocationProvider({ children }: UserGeolocationProviderProps) {
  const clientGeoRef = useClientGeoRef();
  const patchClientGeo = usePatchClientGeo();
  const trackerRef = useRef<UserGeolocationTracker | null>(null);
  const globeHandlersRef = useRef<UserGeolocationGlobeHandlers | null>(null);

  const contextValue = useMemo<UserGeolocationContextValue>(
    () => ({
      seedUserPosition: (position, accuracyMeters) => {
        trackerRef.current?.seedUserPosition(position, accuracyMeters);
      },
      getUserGeoPosition: () => trackerRef.current?.getUserGeoPosition() ?? null,
      registerGlobeGeoHandlers: (handlers) => {
        globeHandlersRef.current = handlers;
      },
    }),
    [],
  );

  useEffect(() => {
    const tracker = createUserGeolocationTracker({
      listeners: {
        onUserPositionChange: (position: GeoLatLon | null) => {
          if (position) {
            patchClientGeoRef(
              clientGeoRef,
              {
                isClientGeoGranted: true,
                mapInitLat: position.latitude,
                mapInitLong: position.longitude,
              },
              patchClientGeo,
            );
            globeHandlersRef.current?.onUserGeoFix?.(
              position.latitude,
              position.longitude,
            );
            return;
          }
          patchClientGeo({
            isClientGeoGranted: false,
            mapInitLat: DEFAULT_CLIENT_GEO.mapInitLat,
            mapInitLong: DEFAULT_CLIENT_GEO.mapInitLong,
          });
          globeHandlersRef.current?.onUserGeoRevoked?.();
        },
        onPermissionGrantedChange: (granted) => {
          if (!granted) {
            patchClientGeo({
              isClientGeoGranted: false,
              mapInitLat: DEFAULT_CLIENT_GEO.mapInitLat,
              mapInitLong: DEFAULT_CLIENT_GEO.mapInitLong,
            });
            globeHandlersRef.current?.onUserGeoRevoked?.();
          }
        },
      },
    });
    trackerRef.current = tracker;
    tracker.start();

    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
  }, [clientGeoRef, patchClientGeo]);

  return (
    <UserGeolocationContext.Provider value={contextValue}>
      {children}
    </UserGeolocationContext.Provider>
  );
}

export function useUserGeolocation(): UserGeolocationContextValue {
  const ctx = useContext(UserGeolocationContext);
  if (!ctx) {
    throw new Error("useUserGeolocation must be used within UserGeolocationProvider");
  }
  return ctx;
}
