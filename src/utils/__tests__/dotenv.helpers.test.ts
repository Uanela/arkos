import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { loadEnvironmentVariables } from "../dotenv.helpers";

// Mock dependencies
jest.mock("fs");
jest.mock("dotenv");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: jest.fn((cwd, fileName) => `${cwd}/${fileName}`),
}));

describe("loadEnvironmentVariables", () => {
  const originalEnv = { ...process.env };
  const mockCwd = "/mock/cwd";

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.cwd = jest.fn().mockReturnValue(mockCwd);

    // Mock fs.existsSync to return false by default
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Mock path.resolve
    (path.resolve as jest.Mock).mockImplementation(
      (cwd, fileName) => `${cwd}/${fileName}`
    );

    // Mock dotenv.config
    (dotenv.config as jest.Mock).mockReturnValue({
      parsed: {},
      error: null,
    });

    // Set default environment variable
    process.env.DATABASE_URL = "db-url";

    // Mock console methods
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("should use development as default environment when NODE_ENV is undefined", () => {
    delete process.env.NODE_ENV;
    loadEnvironmentVariables();

    expect(path.resolve).toHaveBeenCalledWith(mockCwd, ".env.defaults");
    expect(path.resolve).toHaveBeenCalledWith(mockCwd, ".env.undefined");
    expect(path.resolve).toHaveBeenCalledWith(mockCwd, ".env.undefined.local");
  });

  test("should use specified NODE_ENV", () => {
    process.env.NODE_ENV = "production";
    loadEnvironmentVariables();

    expect(path.resolve).toHaveBeenCalledWith(mockCwd, ".env.production");
    expect(path.resolve).toHaveBeenCalledWith(mockCwd, ".env.production.local");
  });

  test("should check files in correct order", () => {
    process.env.NODE_ENV = "test";
    loadEnvironmentVariables();

    expect(path.resolve).toHaveBeenNthCalledWith(1, mockCwd, ".env.defaults");
    expect(path.resolve).toHaveBeenNthCalledWith(2, mockCwd, ".env.test");
    expect(path.resolve).toHaveBeenNthCalledWith(3, mockCwd, ".env.test.local");
    expect(path.resolve).toHaveBeenNthCalledWith(4, mockCwd, ".env.local");
    expect(path.resolve).toHaveBeenNthCalledWith(5, mockCwd, ".env");
  });

  test("should load env file if it exists", () => {
    // Mock only .env.production exists
    (fs.existsSync as jest.Mock).mockImplementation(
      (path) => path === `${mockCwd}/.env.production`
    );
    process.env.NODE_ENV = "production";

    loadEnvironmentVariables();

    expect(dotenv.config).toHaveBeenCalledWith({
      path: `${mockCwd}/.env.production`,
      override: true,
    });
  });

  test("should return path of files successfully loaded", () => {
    process.env.NODE_ENV = "development";

    // Mock that both .env and .env.development exist
    (fs.existsSync as jest.Mock).mockImplementation(
      (path) =>
        path === `${mockCwd}/.env` || path === `${mockCwd}/.env.development`
    );

    const result = loadEnvironmentVariables();

    expect(result).toEqual([`${mockCwd}/.env.development`, `${mockCwd}/.env`]);
  });

  test("should handle dotenv errors", () => {
    // Mock that a file exists but causes an error
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (dotenv.config as jest.Mock).mockReturnValue({
      error: new Error("test error"),
    });

    loadEnvironmentVariables();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Warning: Error loading"),
      expect.any(Error)
    );
  });

  test("should validate required environment variables", () => {
    // Remove required env var
    delete process.env.DATABASE_URL;

    loadEnvironmentVariables();

    expect(console.error).toHaveBeenCalledWith(
      "Missing required environment variables:",
      "DATABASE_URL"
    );
  });

  test("should not log errors if required variables exist", () => {
    // DATABASE_URL is already set in beforeEach
    loadEnvironmentVariables();

    expect(console.error).not.toHaveBeenCalled();
  });

  test("should skip .local env files in production", () => {
    process.env.NODE_ENV = "production";

    // Mock that all files exist
    const mockExistingEnvFiles = [
      `${mockCwd}/.env.local`,
      `${mockCwd}/.env.production`,
      `${mockCwd}/.env.production.local`,
      `${mockCwd}/.env`,
    ];

    (fs.existsSync as jest.Mock).mockImplementation((path) =>
      mockExistingEnvFiles.includes(path)
    );

    const result = loadEnvironmentVariables();

    // Should load .env.production and .env but not the .local files
    expect(result).toContain(`${mockCwd}/.env.production`);
    expect(result).toContain(`${mockCwd}/.env`);
    expect(result).not.toContain(`${mockCwd}/.env.local`);
    expect(result).not.toContain(`${mockCwd}/.env.production.local`);

    // Should log a warning about skipping .local files
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Skipping the local")
    );
  });

  test("should return empty array if no env files are loaded", () => {
    // Make sure no files exist
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = loadEnvironmentVariables();

    expect(result).toEqual([]);
  });
});
