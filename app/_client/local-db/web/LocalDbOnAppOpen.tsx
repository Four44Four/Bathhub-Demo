"use client";

import { useEffect } from "react";

import { getBathroomLocalDb } from "./LocalDbWeb";

/**
 * Web demo: initializes the bathroom local cache when the website is visited.
 * See specifications/bathroom_db_reading.txt (app-open / localized caching).
 */
export function BathroomLocalDbOnAppOpen() {
  useEffect(() => {
    void getBathroomLocalDb().init();
  }, []);

  return null;
}
