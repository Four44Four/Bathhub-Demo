/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testMatch: [
    "<rootDir>/integration-tests/buildDefaultUserSettingsDbSnapshot.test.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
