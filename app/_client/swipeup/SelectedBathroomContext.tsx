"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SelectedBathroomApi = {
  selectedBathroomId: number | null;
  selectBathroom: (bathroomId: number) => void;
  clearSelectedBathroom: () => void;
};

const SelectedBathroomContext = createContext<SelectedBathroomApi | null>(null);

export function SelectedBathroomProvider({ children }: { children: ReactNode }) {
  const [selectedBathroomId, setSelectedBathroomId] = useState<number | null>(
    null,
  );

  const selectBathroom = useCallback((bathroomId: number) => {
    setSelectedBathroomId(bathroomId);
  }, []);

  const clearSelectedBathroom = useCallback(() => {
    setSelectedBathroomId(null);
  }, []);

  const value = useMemo(
    () => ({
      selectedBathroomId,
      selectBathroom,
      clearSelectedBathroom,
    }),
    [clearSelectedBathroom, selectBathroom, selectedBathroomId],
  );

  return (
    <SelectedBathroomContext.Provider value={value}>
      {children}
    </SelectedBathroomContext.Provider>
  );
}

export function useSelectedBathroom(): SelectedBathroomApi {
  const value = useContext(SelectedBathroomContext);
  if (value === null) {
    throw new Error(
      "useSelectedBathroom must be used within SelectedBathroomProvider",
    );
  }
  return value;
}
