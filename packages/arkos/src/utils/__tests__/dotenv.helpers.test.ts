import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import sheu from "../sheu";
import dotenvExpand from "dotenv-expand";

// jest.mock("dotenv-expand");
jest.mock("fs");
jest.mock("../sheu");
jest.mock("dotenv", () => ({
  ...jest.requireActual("dotenv"),
  parse: jest.fn(jest.requireActual("dotenv").expand),
}));
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: jest.fn((cwd, fileName) => `${cwd}/${fileName}`),
}));
jest.mock("dotenv-expand", () => ({
  ...jest.requireActual("dotenv-expand"),
  expand: jest.fn(jest.requireActual("dotenv-expand").expand),
}));

describe("loadEnvironmentVariables", () => {
  const originalEnv = { ...process.env };
  const mockCwd = "/mock/cwd";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.cwd = jest.fn().mockReturnValue(mockCwd);

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    (path.resolve as jest.Mock).mockImplementation(
      (cwd, fileName) => `${cwd}/${fileName}`
    );

    process.env.DATABASE_URL = "db-url";

    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
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

    expect(path.resolve).toHaveBeenNthCalledWith(1, mockCwd, ".env");
    expect(path.resolve).toHaveBeenNthCalledWith(2, mockCwd, ".env.local");
    expect(path.resolve).toHaveBeenNthCalledWith(3, mockCwd, ".env.test");
    expect(path.resolve).toHaveBeenNthCalledWith(4, mockCwd, ".env.test.local");
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

  test("should validate required environment variables", () => {
    // Remove required env var
    delete process.env.DATABASE_URL;

    try {
      loadEnvironmentVariables();
    } catch {
      expect(console.error).toHaveBeenCalledWith(
        "Missing required environment variables:",
        "DATABASE_URL"
      );
    }
  });

  test("should not log errors if required variables exist", () => {
    // DATABASE_URL is already set in beforeEach
    loadEnvironmentVariables();

    expect(console.error).not.toHaveBeenCalled();
  });

  test("should skip .local env files in production (after build)", () => {
    process.env.ARKOS_BUILD = "true";
    process.env.NODE_ENV = "production"; // What actually defines production is ARKOS_BUILD=true

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
    expect(sheu.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping the local")
    );
  });

  test("should return empty array if no env files are loaded", () => {
    // Make sure no files exist
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = loadEnvironmentVariables();

    expect(result).toEqual([]);
  });

  test("should expand variables using values from multiple files", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p.endsWith(".env") || p.endsWith(".env.local")
    );

    (fs.readFileSync as jest.Mock).mockImplementation((p) => {
      if (p.endsWith(".env.local")) return "content-local";
      if (p.endsWith(".env")) return "content-base";
      return "";
    });

    (dotenv.parse as jest.Mock).mockImplementation((content) => {
      if (content === "content-local")
        return { HOST: "localhost", URL: "http://${HOST}:${PORT}" };
      if (content === "content-base") return { PORT: "3000" };
      return {};
    });

    (dotenvExpand.expand as jest.Mock).mockImplementation(({ parsed }) => ({
      parsed: {
        ...parsed,
        URL: "http://localhost:3000",
      },
    }));

    process.env.DATABASE_URL = "mock-db";

    loadEnvironmentVariables();

    expect(dotenvExpand.expand).toHaveBeenCalledWith({
      parsed: expect.objectContaining({
        PORT: "3000",
        HOST: "localhost",
        URL: "http://${HOST}:${PORT}",
      }),
      processEnv: expect.objectContaining({
        PORT: "3000",
        HOST: "localhost",
        URL: "http://${HOST}:${PORT}",
      }),
    });

    expect(process.env.URL).toBe("http://localhost:3000");
  });
});
