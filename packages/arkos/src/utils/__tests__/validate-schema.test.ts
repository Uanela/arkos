import { z, ZodError } from "zod";
import validateSchema, { parseWithWhitelistCheck } from "../validate-schema";
import { getArkosConfig } from "../helpers/arkos-config.helpers";
import deepmerge from "../helpers/deepmerge.helper";

jest.mock("../helpers/arkos-config.helpers");
jest.mock("../helpers/deepmerge.helper");

describe("validateSchema", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { validationOptions: {} },
    });
    (deepmerge as any as jest.Mock).mockImplementation((a, b) => ({
      ...a,
      ...b,
    }));
  });

  describe("basic validation", () => {
    it("should return validated data when validation succeeds", async () => {
      const testSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });
      const validData = { name: "John Doe", email: "john@example.com" };

      const result = await validateSchema(testSchema, validData);

      expect(result).toEqual(validData);
    });

    it("should throw ZodError when validation fails", async () => {
      const testSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });
      const invalidData = { name: "John Doe", email: "invalid-email" };

      await expect(validateSchema(testSchema, invalidData)).rejects.toThrow(
        ZodError
      );
    });

    it("should validate complex nested objects", async () => {
      const addressSchema = z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string(),
      });
      const userSchema = z.object({
        name: z.string(),
        age: z.number().min(18),
        address: addressSchema,
      });
      const validData = {
        name: "Jane Doe",
        age: 25,
        address: {
          street: "123 Main St",
          city: "New York",
          zipCode: "10001",
        },
      };

      const result = await validateSchema(userSchema, validData);

      expect(result).toEqual(validData);
    });

    it("should handle array validations", async () => {
      const arraySchema = z.object({
        items: z.array(z.string()),
      });
      const validData = {
        items: ["item1", "item2", "item3"],
      };

      const result = await validateSchema(arraySchema, validData);

      expect(result).toEqual(validData);
    });

    it("should include all validation errors in the ZodError", async () => {
      const userSchema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
        email: z.string().email(),
      });
      const invalidData = {
        name: "Jo",
        age: 16,
        email: "invalid-email",
      };

      try {
        await validateSchema(userSchema, invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        expect((error as ZodError).issues).toHaveLength(3);
      }
    });
  });

  describe("forbidNonWhitelisted option", () => {
    it("should allow extra keys when forbidNonWhitelisted is false", async () => {
      const testSchema = z.object({
        name: z.string(),
        email: z.string(),
      });
      const dataWithExtra = {
        name: "John",
        email: "john@example.com",
        extra: "field",
      };

      const result = await validateSchema(testSchema, dataWithExtra, {
        forbidNonWhitelisted: false,
      });

      expect(result).toEqual({ name: "John", email: "john@example.com" });
    });

    it("should reject extra keys when forbidNonWhitelisted is true", async () => {
      const testSchema = z.object({
        name: z.string(),
        email: z.string(),
      });
      const dataWithExtra = {
        name: "John",
        email: "john@example.com",
        extra: "field",
      };

      try {
        await validateSchema(testSchema, dataWithExtra, {
          forbidNonWhitelisted: true,
        });
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues).toContainEqual(
          expect.objectContaining({
            code: z.ZodIssueCode.unrecognized_keys,
            keys: ["extra"],
            path: ["extra"],
          })
        );
      }
    });

    it("should reject multiple extra keys", async () => {
      const testSchema = z.object({
        name: z.string(),
      });
      const dataWithExtras = {
        name: "John",
        extra1: "field1",
        extra2: "field2",
      };

      try {
        await validateSchema(testSchema, dataWithExtras, {
          forbidNonWhitelisted: true,
        });
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues).toHaveLength(2);
        expect(zodError.issues).toContainEqual(
          expect.objectContaining({
            keys: ["extra1"],
            path: ["extra1"],
          })
        );
        expect(zodError.issues).toContainEqual(
          expect.objectContaining({
            keys: ["extra2"],
            path: ["extra2"],
          })
        );
      }
    });

    it("should combine validation errors with whitelist errors", async () => {
      const testSchema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });
      const invalidData = {
        name: "Jo",
        email: "invalid",
        extra: "field",
      };

      try {
        await validateSchema(testSchema, invalidData, {
          forbidNonWhitelisted: true,
        });
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues.length).toBeGreaterThanOrEqual(3);
        expect(zodError.issues).toContainEqual(
          expect.objectContaining({
            code: z.ZodIssueCode.unrecognized_keys,
          })
        );
      }
    });

    it("should use global config when no options provided", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        validation: {
          validationOptions: { forbidNonWhitelisted: true },
        },
      });

      const testSchema = z.object({
        name: z.string(),
      });
      const dataWithExtra = {
        name: "John",
        extra: "field",
      };

      try {
        await validateSchema(testSchema, dataWithExtra);
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
      }
    });

    it("should override global config with local options", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        validation: {
          validationOptions: { forbidNonWhitelisted: true },
        },
      });

      const testSchema = z.object({
        name: z.string(),
      });
      const dataWithExtra = {
        name: "John",
        extra: "field",
      };

      const result = await validateSchema(testSchema, dataWithExtra, {
        forbidNonWhitelisted: false,
      });

      expect(result).toEqual({ name: "John" });
    });
  });

  describe("edge cases", () => {
    it("should handle null data", async () => {
      const testSchema = z.object({
        name: z.string(),
      });

      await expect(validateSchema(testSchema, null)).rejects.toThrow(ZodError);
    });

    it("should handle undefined data", async () => {
      const testSchema = z.object({
        name: z.string(),
      });

      await expect(validateSchema(testSchema, undefined)).rejects.toThrow(
        ZodError
      );
    });

    it("should handle empty object", async () => {
      const testSchema = z.object({
        name: z.string().optional(),
      });

      const result = await validateSchema(testSchema, {});

      expect(result).toEqual({});
    });

    it("should handle primitive data types", async () => {
      const testSchema = z.object({
        name: z.string(),
      });

      await expect(validateSchema(testSchema, "string")).rejects.toThrow(
        ZodError
      );
    });
  });
});

describe("parseWithWhitelistCheck", () => {
  describe("success cases", () => {
    it("should return success with valid data", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const data = { name: "John", age: 30 };

      const result = parseWithWhitelistCheck(schema, data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it("should strip extra keys by default when forbidNonWhitelisted is false", () => {
      const schema = z.object({
        name: z.string(),
      });
      const data = { name: "John", extra: "field" };

      const result = parseWithWhitelistCheck(schema, data, {
        forbidNonWhitelisted: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John" });
      }
    });
  });

  describe("failure cases", () => {
    it("should return error with invalid data", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const data = { name: "John", age: "not a number" };

      const result = parseWithWhitelistCheck(schema, data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it("should return error with unrecognized keys when forbidNonWhitelisted is true", () => {
      const schema = z.object({
        name: z.string(),
      });
      const data = { name: "John", extra: "field" };

      const result = parseWithWhitelistCheck(schema, data, {
        forbidNonWhitelisted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: z.ZodIssueCode.unrecognized_keys,
            keys: ["extra"],
            path: ["extra"],
            message: "Unrecognized key(s) in object: 'extra'",
          })
        );
      }
    });

    it("should include path for each unrecognized key", () => {
      const schema = z.object({
        name: z.string(),
      });
      const data = { name: "John", extra1: "field1", extra2: "field2" };

      const result = parseWithWhitelistCheck(schema, data, {
        forbidNonWhitelisted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const extraKeyIssues = result.error.issues.filter(
          (issue) => issue.code === z.ZodIssueCode.unrecognized_keys
        );
        expect(extraKeyIssues).toHaveLength(2);
        expect(extraKeyIssues[0].path).toEqual(["extra1"]);
        expect(extraKeyIssues[1].path).toEqual(["extra2"]);
      }
    });

    it("should combine schema validation errors with whitelist errors", () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number(),
      });
      const data = { name: "Jo", age: "invalid", extra: "field" };

      const result = parseWithWhitelistCheck(schema, data, {
        forbidNonWhitelisted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
        const whitelistErrors = result.error.issues.filter(
          (issue) => issue.code === z.ZodIssueCode.unrecognized_keys
        );
        const schemaErrors = result.error.issues.filter(
          (issue) => issue.code !== z.ZodIssueCode.unrecognized_keys
        );
        expect(whitelistErrors.length).toBeGreaterThan(0);
        expect(schemaErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("options handling", () => {
    it("should handle undefined options", () => {
      const schema = z.object({
        name: z.string(),
      });
      const data = { name: "John", extra: "field" };

      const result = parseWithWhitelistCheck(schema, data);

      expect(result.success).toBe(false);
    });

    it("should handle empty options object", () => {
      const schema = z.object({
        name: z.string(),
      });
      const data = { name: "John", extra: "field" };

      const result = parseWithWhitelistCheck(schema, data, {});

      expect(result.success).toBe(false);
    });
  });

  describe("data type handling", () => {
    it("should handle non-object data types", () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = parseWithWhitelistCheck(schema, "not an object", {
        forbidNonWhitelisted: true,
      });

      expect(result.success).toBe(false);
    });

    it("should handle null data", () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = parseWithWhitelistCheck(schema, null, {
        forbidNonWhitelisted: true,
      });

      expect(result.success).toBe(false);
    });

    it("should handle array data", () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = parseWithWhitelistCheck(schema, [], {
        forbidNonWhitelisted: true,
      });

      expect(result.success).toBe(false);
    });

    describe("deep nested objects", () => {
      it("should validate nested objects without extra keys", () => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            profile: z.object({
              age: z.number(),
              address: z.object({
                city: z.string(),
                zip: z.string(),
              }),
            }),
          }),
        });

        const data = {
          user: {
            name: "John",
            profile: {
              age: 30,
              address: {
                city: "NYC",
                zip: "10001",
              },
            },
          },
        };

        const result = parseWithWhitelistCheck(schema, data, {
          forbidNonWhitelisted: true,
        });

        expect(result.success).toBe(true);
      });

      it("should reject extra keys in nested objects", () => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            profile: z.object({
              age: z.number(),
            }),
          }),
        });

        const data = {
          user: {
            name: "John",
            profile: {
              age: 30,
              extra: "not allowed",
            },
          },
        };

        const result = parseWithWhitelistCheck(schema, data, {
          forbidNonWhitelisted: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              code: z.ZodIssueCode.unrecognized_keys,
              keys: ["extra"],
              path: ["user", "profile", "extra"],
            })
          );
        }
      });

      it("should reject extra keys at multiple nesting levels", () => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            profile: z.object({
              age: z.number(),
            }),
          }),
        });

        const data = {
          user: {
            name: "John",
            extraTop: "not allowed",
            profile: {
              age: 30,
              extraNested: "also not allowed",
            },
          },
          extraRoot: "root level extra",
        };

        const result = parseWithWhitelistCheck(schema, data, {
          forbidNonWhitelisted: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ["extraRoot"],
            })
          );
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ["user", "extraTop"],
            })
          );
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ["user", "profile", "extraNested"],
            })
          );
        }
      });

      it("should handle arrays of nested objects", () => {
        const schema = z.object({
          users: z.array(
            z.object({
              name: z.string(),
              address: z.object({
                city: z.string(),
              }),
            })
          ),
        });

        const data = {
          users: [
            {
              name: "John",
              address: {
                city: "NYC",
                extra: "not allowed",
              },
            },
            {
              name: "Jane",
              address: {
                city: "LA",
              },
            },
          ],
        };

        const result = parseWithWhitelistCheck(schema, data, {
          forbidNonWhitelisted: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ["users", 0, "address", "extra"],
            })
          );
        }
      });

      it("should handle optional nested objects", () => {
        const schema = z.object({
          user: z.object({
            name: z.string(),
            profile: z
              .object({
                age: z.number(),
              })
              .optional(),
          }),
        });

        const data = {
          user: {
            name: "John",
            profile: {
              age: 30,
              extra: "not allowed",
            },
          },
        };

        const result = parseWithWhitelistCheck(schema, data, {
          forbidNonWhitelisted: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(
            expect.objectContaining({
              path: ["user", "profile", "extra"],
            })
          );
        }
      });
    });
  });
});
