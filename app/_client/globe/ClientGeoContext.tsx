"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

export type ClientGeoState = {
  isClientGeoGranted: boolean;
  mapInitLat: number;
  mapInitLong: number;
};

export const DEFAULT_CLIENT_GEO: ClientGeoState = {
  isClientGeoGranted: false,
  mapInitLat: 0,
  mapInitLong: 0,
};

type ClientGeoContextValue = {
  clientGeoRef: MutableRefObject<ClientGeoState>;
  clientGeo: ClientGeoState;
  patchClientGeo: (patch: Partial<ClientGeoState>) => void;
};

const ClientGeoContext = createContext<ClientGeoContextValue | null>(null);

export type ClientGeoProviderProps = {
  children: ReactNode;
};

export function ClientGeoProvider({ children }: ClientGeoProviderProps) {
  const clientGeoRef = useRef<ClientGeoState>({ ...DEFAULT_CLIENT_GEO });
  const [clientGeo, setClientGeo] = useState<ClientGeoState>({
    ...DEFAULT_CLIENT_GEO,
  });

  const patchClientGeo = useCallback((patch: Partial<ClientGeoState>) => {
    clientGeoRef.current = { ...clientGeoRef.current, ...patch };
    setClientGeo(clientGeoRef.current);
  }, []);

  return (
    <ClientGeoContext.Provider
      value={{ clientGeoRef, clientGeo, patchClientGeo }}
    >
      {children}
    </ClientGeoContext.Provider>
  );
}

/** Latest client geo state for callbacks and intervals that must not close over stale props. */
export function useClientGeoRef(): MutableRefObject<ClientGeoState> {
  const ctx = useContext(ClientGeoContext);
  if (!ctx) {
    throw new Error("useClientGeoRef must be used within ClientGeoProvider");
  }
  return ctx.clientGeoRef;
}

/** Reactive client geo snapshot for components that must re-render on permission changes. */
export function useClientGeo(): ClientGeoState {
  const ctx = useContext(ClientGeoContext);
  if (!ctx) {
    throw new Error("useClientGeo must be used within ClientGeoProvider");
  }
  return ctx.clientGeo;
}

export function usePatchClientGeo(): (patch: Partial<ClientGeoState>) => void {
  const ctx = useContext(ClientGeoContext);
  if (!ctx) {
    throw new Error("usePatchClientGeo must be used within ClientGeoProvider");
  }
  return ctx.patchClientGeo;
}

/** Imperative geo patch used from non-React callbacks (e.g. geolocation watchers). */
export function patchClientGeoRef(
  ref: MutableRefObject<ClientGeoState>,
  patch: Partial<ClientGeoState>,
  notify?: (next: ClientGeoState) => void,
): void {
  ref.current = { ...ref.current, ...patch };
  notify?.(ref.current);
}
