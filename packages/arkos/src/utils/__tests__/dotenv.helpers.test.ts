import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import sheu from "../sheu";

// Mock dependencies
jest.mock("fs");
jest.mock("../sheu");
jest.mock("dotenv");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: jest.fn((cwd, fileName) => `${cwd}/${fileName}`),
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

    (dotenv.config as jest.Mock).mockReturnValue({
      parsed: {},
      error: null,
    });

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

  test("should expand variable references across env files", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${mockCwd}/.env` || p === `${mockCwd}/.env.local`
    );
    (fs.readFileSync as jest.Mock).mockImplementation((p) => {
      if (p === `${mockCwd}/.env`)
        return Buffer.from("BASE_URL=http://localhost");
      if (p === `${mockCwd}/.env.local`)
        return Buffer.from("API_URL=${BASE_URL}/api");
      return Buffer.from("");
    });
    (dotenv.parse as jest.Mock).mockImplementation((buf) => {
      const content = buf.toString();
      if (content.includes("BASE_URL="))
        return { BASE_URL: "http://localhost" };
      if (content.includes("API_URL=")) return { API_URL: "${BASE_URL}/api" };
      return {};
    });

    loadEnvironmentVariables();

    expect(process.env.API_URL).toBe("http://localhost/api");
  });

  test("should expand unbraced variable references", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${mockCwd}/.env`
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from(
        "HOST=localhost\nPORT=5432\nDB=postgres\nDATABASE_URL=postgres://$HOST:$PORT/$DB"
      )
    );
    (dotenv.parse as jest.Mock).mockReturnValue({
      HOST: "localhost",
      PORT: "5432",
      DB: "postgres",
      DATABASE_URL: "postgres://$HOST:$PORT/$DB",
    });

    loadEnvironmentVariables();

    expect(process.env.DATABASE_URL).toBe("postgres://localhost:5432/postgres");
  });

  test("should use default value when variable is not set", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${mockCwd}/.env`
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from("DATABASE_URL=${DB_URL:-postgres://fallback:5432/mydb}")
    );
    (dotenv.parse as jest.Mock).mockReturnValue({
      DATABASE_URL: "${DB_URL:-postgres://fallback:5432/mydb}",
    });

    loadEnvironmentVariables();

    expect(process.env.DATABASE_URL).toBe("postgres://fallback:5432/mydb");
  });

  test("should use variable value over default when variable is set", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${mockCwd}/.env` || p === `${mockCwd}/.env.local`
    );
    (fs.readFileSync as jest.Mock).mockImplementation((p) => {
      if (p === `${mockCwd}/.env`)
        return Buffer.from("DB_URL=postgres://real:5432/realdb");
      if (p === `${mockCwd}/.env.local`)
        return Buffer.from(
          "DATABASE_URL=${DB_URL:-postgres://fallback:5432/mydb}"
        );
      return Buffer.from("");
    });
    (dotenv.parse as jest.Mock).mockImplementation((buf) => {
      const content = buf.toString();
      if (content.includes("DB_URL="))
        return { DB_URL: "postgres://real:5432/realdb" };
      if (content.includes("DATABASE_URL="))
        return { DATABASE_URL: "${DB_URL:-postgres://fallback:5432/mydb}" };
      return {};
    });

    loadEnvironmentVariables();

    expect(process.env.DATABASE_URL).toBe("postgres://real:5432/realdb");
  });

  test("later env files should override earlier ones before expansion", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${mockCwd}/.env` || p === `${mockCwd}/.env.local`
    );
    (fs.readFileSync as jest.Mock).mockImplementation((p) => {
      if (p === `${mockCwd}/.env`)
        return Buffer.from("PORT=3000\nAPP_URL=http://localhost:${PORT}");
      if (p === `${mockCwd}/.env.local`) return Buffer.from("PORT=4000");
      return Buffer.from("");
    });
    (dotenv.parse as jest.Mock).mockImplementation((buf) => {
      const content = buf.toString();
      if (content.includes("APP_URL"))
        return { PORT: "3000", APP_URL: "http://localhost:${PORT}" };
      if (content.includes("4000")) return { PORT: "4000" };
      return {};
    });

    loadEnvironmentVariables();

    expect(process.env.APP_URL).toBe("http://localhost:4000");
  });

  test("should resolve escaped dollar signs without expanding them", () => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p) => p === `${mockCwd}/.env`
    );
    (fs.readFileSync as jest.Mock).mockReturnValue(
      Buffer.from("DATABASE_URL=postgres://user:\\$PASSWORD@localhost/db")
    );
    (dotenv.parse as jest.Mock).mockReturnValue({
      DATABASE_URL: "postgres://user:\\$PASSWORD@localhost/db",
    });

    loadEnvironmentVariables();

    expect(process.env.DATABASE_URL).toBe(
      "postgres://user:$PASSWORD@localhost/db"
    );
  });
});
