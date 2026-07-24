/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/integration-tests/jest.integration.setup.ts"],
  testMatch: ["<rootDir>/integration-tests/**/*.integration.test.ts"],
};

module.exports = createJestConfig(customJestConfig);
