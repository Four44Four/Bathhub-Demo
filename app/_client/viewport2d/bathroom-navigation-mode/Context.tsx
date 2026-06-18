"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  type FindNearestBathroomTarget,
  type FindNearestBathroomRequestState,
  INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE,
  findNearestBathroomRequestBegin,
  findNearestBathroomRequestCanBegin,
  findNearestBathroomRequestReset,
  findNearestBathroomRequestResolveSuccess,
} from "../../pure/viewport2d/FindNearestBathroomState";
import { type SavedGlobeCameraState } from "../../pure/globe/GlobeCameraState";
import {
  type PersistedBathroomActiveNavigation,
  readInitialBathroomActiveNavigationFromWindow,
  writeBathroomActiveNavigation,
} from "@/app/_shared/find-nearest-bathroom/BathroomActiveNavigationPersistence";

export type BathroomNavigationPreviewExitHandler = () => void;

export type BathroomNavigationModeContextValue = {
  isPreviewActive: boolean;
  previewTarget: FindNearestBathroomTarget | null;
  savedCameraState: SavedGlobeCameraState | null;
  requestState: FindNearestBathroomRequestState;
  activeNavigation: PersistedBathroomActiveNavigation | null;
  /** Non-persistent: spec pauses path updates when geolocation is unavailable. */
  activeNavigationPaused: boolean;
  setActiveNavigationPaused: Dispatch<SetStateAction<boolean>>;
  updateActiveNavigation: (value: PersistedBathroomActiveNavigation | null) => void;
  beginFindNearestBathroom: () => void;
  enterPreview: (
    target: FindNearestBathroomTarget,
    savedCameraState: SavedGlobeCameraState,
    findOriginLocation: { latitude: number; longitude: number },
  ) => void;
  exitPreview: () => void;
  acceptPreviewNavigation: () => void;
  clearActiveNavigation: () => void;
  setRequestState: Dispatch<SetStateAction<FindNearestBathroomRequestState>>;
  registerPreviewExitHandler: (
    handler: BathroomNavigationPreviewExitHandler,
  ) => () => void;
};

const BathroomNavigationModeContext =
  createContext<BathroomNavigationModeContextValue | null>(null);

export type BathroomNavigationModeProviderProps = {
  children: ReactNode;
};

export function BathroomNavigationModeProvider({
  children,
}: BathroomNavigationModeProviderProps) {
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FindNearestBathroomTarget | null>(
    null,
  );
  const [findOriginLocation, setFindOriginLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [savedCameraState, setSavedCameraState] =
    useState<SavedGlobeCameraState | null>(null);
  const [requestState, setRequestState] = useState<FindNearestBathroomRequestState>(
    INITIAL_FIND_NEAREST_BATHROOM_REQUEST_STATE,
  );
  /** SSR-safe: restore from localStorage after mount to avoid hydration mismatch. */
  const [activeNavigation, setActiveNavigation] =
    useState<PersistedBathroomActiveNavigation | null>(null);
  const [activeNavigationPaused, setActiveNavigationPaused] = useState(false);
  const previewExitHandlerRef = useRef<BathroomNavigationPreviewExitHandler | null>(
    null,
  );

  useLayoutEffect(() => {
    const persisted = readInitialBathroomActiveNavigationFromWindow();
    if (persisted) {
      setActiveNavigation(persisted);
    }
  }, []);

  const updateActiveNavigation = useCallback(
    (value: PersistedBathroomActiveNavigation | null) => {
      try {
        writeBathroomActiveNavigation(window.localStorage, value);
      } catch {
        // private mode / quota
      }
      setActiveNavigation(value);
    },
    [],
  );

  const beginFindNearestBathroom = useCallback(() => {
    if (!findNearestBathroomRequestCanBegin(isPreviewActive, activeNavigation !== null)) {
      return;
    }
    setRequestState((state) => findNearestBathroomRequestBegin(state));
  }, [activeNavigation, isPreviewActive]);

  const enterPreview = useCallback(
    (
      target: FindNearestBathroomTarget,
      cameraState: SavedGlobeCameraState,
      originLocation: { latitude: number; longitude: number },
    ) => {
      setPreviewTarget(target);
      setSavedCameraState(cameraState);
      setFindOriginLocation(originLocation);
      setIsPreviewActive(true);
      setRequestState((state) => findNearestBathroomRequestResolveSuccess(state));
    },
    [],
  );

  const exitPreview = useCallback(() => {
    setIsPreviewActive(false);
    setPreviewTarget(null);
    setSavedCameraState(null);
    setFindOriginLocation(null);
    setRequestState(() => findNearestBathroomRequestReset());
    previewExitHandlerRef.current?.();
  }, []);

  const acceptPreviewNavigation = useCallback(() => {
    if (!previewTarget) return;
    const persisted: PersistedBathroomActiveNavigation = {
      targetBathroomId: previewTarget.id,
      targetLatitude: previewTarget.latitude,
      targetLongitude: previewTarget.longitude,
      ...(findOriginLocation
        ? {
            findOriginLatitude: findOriginLocation.latitude,
            findOriginLongitude: findOriginLocation.longitude,
          }
        : {}),
    };
    try {
      writeBathroomActiveNavigation(window.localStorage, persisted);
    } catch {
      // private mode / quota
    }
    setActiveNavigation(persisted);
    setActiveNavigationPaused(false);
    setIsPreviewActive(false);
    setPreviewTarget(null);
    setSavedCameraState(null);
    setFindOriginLocation(null);
    setRequestState(() => findNearestBathroomRequestReset());
    previewExitHandlerRef.current?.();
  }, [findOriginLocation, previewTarget]);

  const clearActiveNavigation = useCallback(() => {
    try {
      writeBathroomActiveNavigation(window.localStorage, null);
    } catch {
      // ignore
    }
    setActiveNavigation(null);
    setActiveNavigationPaused(false);
  }, []);

  const registerPreviewExitHandler = useCallback(
    (handler: BathroomNavigationPreviewExitHandler) => {
      previewExitHandlerRef.current = handler;
      return () => {
        if (previewExitHandlerRef.current === handler) {
          previewExitHandlerRef.current = null;
        }
      };
    },
    [],
  );

  const value = useMemo<BathroomNavigationModeContextValue>(
    () => ({
      isPreviewActive,
      previewTarget,
      savedCameraState,
      requestState,
      activeNavigation,
      activeNavigationPaused,
      setActiveNavigationPaused,
      updateActiveNavigation,
      beginFindNearestBathroom,
      enterPreview,
      exitPreview,
      acceptPreviewNavigation,
      clearActiveNavigation,
      setRequestState,
      registerPreviewExitHandler,
    }),
    [
      acceptPreviewNavigation,
      activeNavigation,
      activeNavigationPaused,
      beginFindNearestBathroom,
      clearActiveNavigation,
      enterPreview,
      exitPreview,
      isPreviewActive,
      previewTarget,
      registerPreviewExitHandler,
      requestState,
      savedCameraState,
      updateActiveNavigation,
    ],
  );

  return (
    <BathroomNavigationModeContext.Provider value={value}>
      {children}
    </BathroomNavigationModeContext.Provider>
  );
}

export function useBathroomNavigationMode(): BathroomNavigationModeContextValue {
  const ctx = useContext(BathroomNavigationModeContext);
  if (!ctx) {
    throw new Error(
      "useBathroomNavigationMode must be used within BathroomNavigationModeProvider",
    );
  }
  return ctx;
}
