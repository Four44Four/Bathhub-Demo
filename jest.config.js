const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.ts", "<rootDir>/test/**/*.test.tsx"],
};

module.exports = createJestConfig(customJestConfig);
