// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/scripts"],
  testMatch: [
    "**/__tests__/**/*.ts?(x)",
    "**/__specs__/**/*.ts?(x)",
    "**/?(*.)+(spec|test).ts?(x)",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!@scalar/express-api-reference)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  silent: false,
  setupFiles: ["<rootDir>/jest.setup.ts"],
  maxWorkers: '2',
};

export default config;
