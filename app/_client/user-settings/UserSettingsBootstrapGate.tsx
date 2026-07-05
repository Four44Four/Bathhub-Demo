"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAlertSystem } from "../viewport2d/AlertSystem";
import { useUserSettings } from "./UserSettingsContext";
import { UserSettingsSchemaOutOfDateScreen } from "./UserSettingsSchemaOutOfDateScreen";

export type UserSettingsBootstrapGateProps = {
  children: ReactNode;
};

export function UserSettingsBootstrapGate({
  children,
}: UserSettingsBootstrapGateProps) {
  const { bootstrapPhase, schemaUpdateHasErrored } = useUserSettings();
  const { showImportantAlert } = useAlertSystem();
  const hasShownMigrationErrorRef = useRef(false);
  const [schemaScreenMounted, setSchemaScreenMounted] = useState(false);
  const [schemaScreenExiting, setSchemaScreenExiting] = useState(false);

  const isSchemaOutOfDate = bootstrapPhase === "schema_out_of_date";

  useEffect(() => {
    if (isSchemaOutOfDate) {
      setSchemaScreenMounted(true);
      setSchemaScreenExiting(false);
      return;
    }

    if (schemaScreenMounted && !schemaScreenExiting) {
      setSchemaScreenExiting(true);
    }
  }, [isSchemaOutOfDate, schemaScreenMounted, schemaScreenExiting]);

  const handleSchemaScreenExitComplete = useCallback(() => {
    setSchemaScreenMounted(false);
    setSchemaScreenExiting(false);
  }, []);

  useEffect(() => {
    if (!schemaUpdateHasErrored || hasShownMigrationErrorRef.current) return;
    hasShownMigrationErrorRef.current = true;
    showImportantAlert({
      message:
        "There was a problem updating user settings data to a newer version, settings will be saved on device, but default settings will be used until it is eventually fixed",
      okLabel: "Ok",
      positive: false,
    });
  }, [schemaUpdateHasErrored, showImportantAlert]);

  return (
    <>
      {children}
      {schemaScreenMounted ? (
        <UserSettingsSchemaOutOfDateScreen
          exiting={schemaScreenExiting}
          onExitComplete={handleSchemaScreenExitComplete}
        />
      ) : null}
    </>
  );
}
