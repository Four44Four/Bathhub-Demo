"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AddBathroomModeExitHandler = (options: {
  withNewBathroom: boolean;
}) => void;

export type AddBathroomModeContextValue = {
  isActive: boolean;
  enterAddBathroomMode: () => void;
  exitAddBathroomMode: (options: { withNewBathroom: boolean }) => void;
  registerExitHandler: (handler: AddBathroomModeExitHandler) => () => void;
};

const AddBathroomModeContext = createContext<AddBathroomModeContextValue | null>(
  null,
);

export type AddBathroomModeProviderProps = {
  children: ReactNode;
};

export function AddBathroomModeProvider({ children }: AddBathroomModeProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const exitHandlerRef = useRef<AddBathroomModeExitHandler | null>(null);

  const enterAddBathroomMode = useCallback(() => {
    setIsActive(true);
  }, []);

  const exitAddBathroomMode = useCallback(
    ({ withNewBathroom }: { withNewBathroom: boolean }) => {
      setIsActive(false);
      exitHandlerRef.current?.({ withNewBathroom });
    },
    [],
  );

  const registerExitHandler = useCallback(
    (handler: AddBathroomModeExitHandler) => {
      exitHandlerRef.current = handler;
      return () => {
        if (exitHandlerRef.current === handler) {
          exitHandlerRef.current = null;
        }
      };
    },
    [],
  );

  const value = useMemo<AddBathroomModeContextValue>(
    () => ({
      isActive,
      enterAddBathroomMode,
      exitAddBathroomMode,
      registerExitHandler,
    }),
    [enterAddBathroomMode, exitAddBathroomMode, isActive, registerExitHandler],
  );

  return (
    <AddBathroomModeContext.Provider value={value}>
      {children}
    </AddBathroomModeContext.Provider>
  );
}

export function useAddBathroomMode(): AddBathroomModeContextValue {
  const ctx = useContext(AddBathroomModeContext);
  if (ctx == null) {
    throw new Error(
      "useAddBathroomMode must be used within AddBathroomModeProvider",
    );
  }
  return ctx;
}
