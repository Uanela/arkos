import RouteConfigValidator from "../route-config-validator";
import { getArkosConfig } from "../../../exports";
import { z } from "zod";

jest.mock("../../../exports", () => ({
  getArkosConfig: jest.fn(),
}));
jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));

const mockClass = class TestClass {};

describe("RouteConfigValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not throw when validation matches swagger mode for zod", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({ swagger: { mode: "zod" } });
    const config = {
      route: "/test",
      validation: { query: z.object({ name: z.string() }) },
    };
    expect(() => RouteConfigValidator.validate(config as any)).not.toThrow();
  });

  it("should not throw when validation matches swagger mode for class-validator", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      swagger: { mode: "class-validator" },
    });
    const config = {
      route: "/test",
      validation: { query: mockClass },
    };
    expect(() => RouteConfigValidator.validate(config as any)).not.toThrow();
  });

  it("should throw when zod schema used but swagger mode is not zod", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      swagger: { mode: "class-validator" },
    });
    const config = {
      route: "/test",
      validation: { query: z.object({}) },
    };
    expect(() => RouteConfigValidator.validate(config as any)).toThrow(
      /Zod schema used/
    );
  });

  it("should throw when class used but swagger mode is not class-validator", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({ swagger: { mode: "zod" } });
    const config = {
      route: "/test",
      validation: { body: mockClass },
    };
    expect(() => RouteConfigValidator.validate(config as any)).toThrow(
      /Class validator used/
    );
  });

  it("should throw on duplicate query definitions", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({ swagger: { mode: "zod" } });
    const config = {
      route: "/test",
      validation: { query: z.object({}) },
      experimental: {
        openapi: { parameters: [{ in: "query" }] },
      },
    };
    expect(() => RouteConfigValidator.validate(config as any)).toThrow(
      /Duplicate query validation definitions/
    );
  });

  it("should throw on duplicate path parameter definitions", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({ swagger: { mode: "zod" } });
    const config = {
      route: "/test",
      validation: { params: z.object({}) },
      experimental: {
        openapi: { parameters: [{ in: "path" }] },
      },
    };
    expect(() => RouteConfigValidator.validate(config as any)).toThrow(
      /Duplicate path parameter validation definitions/
    );
  });

  it("should throw on duplicate request body definitions", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({ swagger: { mode: "zod" } });
    const config = {
      route: "/test",
      validation: { body: z.object({}) },
      experimental: {
        openapi: { requestBody: {} },
      },
    };
    expect(() => RouteConfigValidator.validate(config as any)).toThrow(
      /Duplicate request body validation definitions/
    );
  });

  describe("isArkosRouteConfig", () => {
    it("should return true for valid ArkosRouteConfig object", () => {
      const obj = { route: "/test" };
      expect(RouteConfigValidator.isArkosRouteConfig(obj)).toBe(true);
    });

    it("should return false for non-object values", () => {
      expect(RouteConfigValidator.isArkosRouteConfig(null)).toBe(false);
      expect(RouteConfigValidator.isArkosRouteConfig(undefined)).toBe(false);
      expect(RouteConfigValidator.isArkosRouteConfig(123)).toBe(false);
      expect(RouteConfigValidator.isArkosRouteConfig("string")).toBe(false);
    });

    it("should return false for object without route property", () => {
      const obj = { path: "/test" };
      expect(RouteConfigValidator.isArkosRouteConfig(obj)).toBe(false);
    });
  });
});
