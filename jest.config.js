const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/integration-tests/jest.integration.setup.ts"],
  testMatch: [
    "<rootDir>/unit-tests/**/*.test.ts",
    "<rootDir>/unit-tests/**/*.test.tsx",
    "<rootDir>/integration-tests/**/*.test.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
