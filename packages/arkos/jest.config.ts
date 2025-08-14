// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transformIgnorePatterns: [
    // Allow Jest to transform ESM dependencies
    "node_modules/(?!@scalar/express-api-reference)",
  ],
  transform: {
    // "^.+\\.tsx?$": "ts-jest",
    // "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  silent: false,
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

export default config;
