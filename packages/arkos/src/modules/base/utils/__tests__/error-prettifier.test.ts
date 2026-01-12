import { ValidationError } from "class-validator";
import { ZodError, ZodIssue } from "zod";
import { ErrorPrettifier } from "../error-prettifier";

describe("ErrorPrettifier", () => {
  let prettifier: ErrorPrettifier;

  beforeEach(() => {
    prettifier = new ErrorPrettifier();
  });

  describe("Class-Validator", () => {
    describe("Top-level field errors", () => {
      it("should prettify a simple string constraint error", () => {
        const errors: ValidationError[] = [
          {
            property: "name",
            constraints: {
              isString: "name must be a string",
            },
            children: [],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toEqual([
          {
            message: "name must be a string",
            code: "NameIsStringConstraint",
          },
        ]);
      });

      it("should prettify multiple constraints on the same field", () => {
        const errors: ValidationError[] = [
          {
            property: "email",
            constraints: {
              isEmail: "email must be an email",
              isNotEmpty: "email should not be empty",
            },
            children: [],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({
          message: "email must be an email",
          code: "EmailIsEmailConstraint",
        });
        expect(result).toContainEqual({
          message: "email should not be empty",
          code: "EmailIsNotEmptyConstraint",
        });
      });

      it("should prettify UUID constraint error", () => {
        const errors: ValidationError[] = [
          {
            property: "id",
            constraints: {
              isUuid: "id must be a UUID",
            },
            children: [],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toEqual([
          {
            message: "id must be a UUID",
            code: "IdIsUuidConstraint",
          },
        ]);
      });

      it("should prettify number constraint errors", () => {
        const errors: ValidationError[] = [
          {
            property: "age",
            constraints: {
              isNumber: "age must be a number",
              min: "age must not be less than 18",
            },
            children: [],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({
          message: "age must be a number",
          code: "AgeIsNumberConstraint",
        });
        expect(result).toContainEqual({
          message: "age must not be less than 18",
          code: "AgeMinConstraint",
        });
      });
    });

    describe("Nested field errors", () => {
      it("should prettify one-level nested errors with full path in message", () => {
        const errors: ValidationError[] = [
          {
            property: "user",
            children: [
              {
                property: "id",
                constraints: {
                  isUuid: "id must be a UUID",
                },
                children: [],
              } as ValidationError,
            ],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toEqual([
          {
            message: "user.id must be a UUID",
            code: "UserIdIsUuidConstraint",
          },
        ]);
      });

      it("should prettify deeply nested errors", () => {
        const errors: ValidationError[] = [
          {
            property: "user",
            children: [
              {
                property: "address",
                children: [
                  {
                    property: "street",
                    constraints: {
                      isString: "street must be a string",
                    },
                    children: [],
                  } as ValidationError,
                ],
              } as ValidationError,
            ],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toEqual([
          {
            message: "user.address.street must be a string",
            code: "UserAddressStreetIsStringConstraint",
          },
        ]);
      });

      it("should prettify multiple nested fields with errors", () => {
        const errors: ValidationError[] = [
          {
            property: "user",
            children: [
              {
                property: "name",
                constraints: {
                  isString: "name must be a string",
                },
                children: [],
              } as ValidationError,
              {
                property: "email",
                constraints: {
                  isEmail: "email must be an email",
                },
                children: [],
              } as ValidationError,
            ],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({
          message: "user.name must be a string",
          code: "UserNameIsStringConstraint",
        });
        expect(result).toContainEqual({
          message: "user.email must be an email",
          code: "UserEmailIsEmailConstraint",
        });
      });

      it("should prettify mixed nested and top-level errors", () => {
        const errors: ValidationError[] = [
          {
            property: "id",
            constraints: {
              isUuid: "id must be a UUID",
            },
            children: [],
          } as ValidationError,
          {
            property: "user",
            children: [
              {
                property: "email",
                constraints: {
                  isEmail: "email must be an email",
                },
                children: [],
              } as ValidationError,
            ],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({
          message: "id must be a UUID",
          code: "IdIsUuidConstraint",
        });
        expect(result).toContainEqual({
          message: "user.email must be an email",
          code: "UserEmailIsEmailConstraint",
        });
      });
    });

    describe("Empty and edge cases", () => {
      it("should return empty array for no errors", () => {
        const errors: ValidationError[] = [];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toEqual([]);
      });

      it("should skip errors without constraints", () => {
        const errors: ValidationError[] = [
          {
            property: "user",
            children: [],
          } as ValidationError,
        ];

        const result = prettifier.prettify("class-validator", errors);

        expect(result).toEqual([]);
      });
    });
  });

  describe("Zod", () => {
    describe("Top-level field errors", () => {
      it("should prettify invalid_type error for string", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["name"],
            message: "Expected string, received number",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "name must be valid: Expected string, received number",
            code: "NameIsStringConstraint",
          },
        ]);
      });

      it("should prettify invalid_type error for number", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "number",
            received: "string",
            path: ["age"],
            message: "Expected number, received string",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "age must be valid: Expected number, received string",
            code: "AgeIsNumberConstraint",
          },
        ]);
      });

      it("should prettify too_small constraint for string (minLength)", () => {
        const zodError = new ZodError([
          {
            code: "too_small",
            minimum: 100,
            type: "string",
            inclusive: true,
            exact: false,
            path: ["id"],
            message: "String must contain at least 100 character(s)",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "id must contain at least 100 character(s)",
            code: "IdMinLengthConstraint",
          },
        ]);
      });

      it("should prettify too_small constraint for number (min)", () => {
        const zodError = new ZodError([
          {
            code: "too_small",
            minimum: 18,
            type: "number",
            inclusive: true,
            exact: false,
            path: ["age"],
            message: "Number must be greater than or equal to 18",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "age must be greater than or equal to 18",
            code: "AgeMinConstraint",
          },
        ]);
      });

      it("should prettify too_big constraint for string (maxLength)", () => {
        const zodError = new ZodError([
          {
            code: "too_big",
            maximum: 50,
            type: "string",
            inclusive: true,
            exact: false,
            path: ["name"],
            message: "String must contain at most 50 character(s)",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "name must contain at most 50 character(s)",
            code: "NameMaxLengthConstraint",
          },
        ]);
      });

      it("should prettify invalid_string error for email", () => {
        const zodError = new ZodError([
          {
            code: "invalid_string",
            validation: "email",
            path: ["email"],
            message: "Invalid email",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "email must be a valid email",
            code: "EmailIsEmailConstraint",
          },
        ]);
      });

      it("should prettify invalid_string error for UUID", () => {
        const zodError = new ZodError([
          {
            code: "invalid_string",
            validation: "uuid",
            path: ["id"],
            message: "Invalid uuid",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "id must be a valid uuid",
            code: "IdIsUuidConstraint",
          },
        ]);
      });

      it("should prettify required field error", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "undefined",
            path: ["email"],
            message: "Required",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "email is required",
            code: "EmailIsStringConstraint",
          },
        ]);
      });

      it("should prettify invalid_enum_value error", () => {
        const zodError = new ZodError([
          {
            code: "invalid_enum_value",
            options: ["admin", "user"],
            path: ["role"],
            message: "Invalid enum value",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "role must be a valid enum value",
            code: "RoleIsEnumConstraint",
          },
        ]);
      });

      it("should prettify boolean type error", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "boolean",
            received: "string",
            path: ["isActive"],
            message: "Expected boolean, received string",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message:
              "isActive must be valid: Expected boolean, received string",
            code: "IsActiveIsBooleanConstraint",
          },
        ]);
      });
    });

    describe("Nested field errors", () => {
      it("should prettify one-level nested errors", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["user", "id"],
            message: "Expected string, received number",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "user.id must be valid: Expected string, received number",
            code: "UserIdIsStringConstraint",
          },
        ]);
      });

      it("should prettify deeply nested errors", () => {
        const zodError = new ZodError([
          {
            code: "invalid_string",
            validation: "email",
            path: ["user", "contact", "email"],
            message: "Invalid email",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "user.contact.email must be a valid email",
            code: "UserContactEmailIsEmailConstraint",
          },
        ]);
      });

      it("should prettify nested error with too_small constraint", () => {
        const zodError = new ZodError([
          {
            code: "too_small",
            minimum: 100,
            type: "string",
            inclusive: true,
            exact: false,
            path: ["user", "id"],
            message: "String must contain at least 100 character(s)",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "user.id must contain at least 100 character(s)",
            code: "UserIdMinLengthConstraint",
          },
        ]);
      });
    });

    describe("Array field errors", () => {
      it("should prettify array element error with index", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["tags", 0],
            message: "Expected string, received number",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "tags[0] must be valid: Expected string, received number",
            code: "TagsIsStringConstraint",
          },
        ]);
      });

      it("should prettify nested array element error", () => {
        const zodError = new ZodError([
          {
            code: "invalid_string",
            validation: "email",
            path: ["users", 0, "email"],
            message: "Invalid email",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "users[0].email must be a valid email",
            code: "UsersEmailIsEmailConstraint",
          },
        ]);
      });

      it("should prettify multiple array indices", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["posts", 1, "tags", 2, "name"],
            message: "Expected string, received number",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message:
              "posts[1].tags[2].name must be valid: Expected string, received number",
            code: "PostsTagsNameIsStringConstraint",
          },
        ]);
      });

      it("should prettify array size constraint", () => {
        const zodError = new ZodError([
          {
            code: "too_small",
            minimum: 1,
            type: "array",
            inclusive: true,
            exact: false,
            path: ["tags"],
            message: "Array must contain at least 1 element(s)",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "tags must contain at least 1 element(s)",
            code: "TagsArrayMinSizeConstraint",
          },
        ]);
      });
    });

    describe("Multiple errors", () => {
      it("should prettify multiple field errors", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "undefined",
            path: ["name"],
            message: "Required",
          } as ZodIssue,
          {
            code: "invalid_string",
            validation: "email",
            path: ["email"],
            message: "Invalid email",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({
          message: "name is required",
          code: "NameIsStringConstraint",
        });
        expect(result).toContainEqual({
          message: "email must be a valid email",
          code: "EmailIsEmailConstraint",
        });
      });

      it("should prettify mixed top-level and nested errors", () => {
        const zodError = new ZodError([
          {
            code: "invalid_string",
            validation: "uuid",
            path: ["id"],
            message: "Invalid uuid",
          } as ZodIssue,
          {
            code: "invalid_string",
            validation: "email",
            path: ["user", "email"],
            message: "Invalid email",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({
          message: "id must be a valid uuid",
          code: "IdIsUuidConstraint",
        });
        expect(result).toContainEqual({
          message: "user.email must be a valid email",
          code: "UserEmailIsEmailConstraint",
        });
      });
    });

    describe("Edge cases", () => {
      it("should handle root-level errors", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "object",
            received: "string",
            path: [],
            message: "Expected object, received string",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "Expected object, received string",
            code: "IsObjectConstraint",
          },
        ]);
      });

      it("should handle custom constraint", () => {
        const zodError = new ZodError([
          {
            code: "custom",
            path: ["password"],
            message: "Password too weak",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "password Password too weak",
            code: "PasswordCustomConstraint",
          },
        ]);
      });

      it("should handle URL validation", () => {
        const zodError = new ZodError([
          {
            code: "invalid_string",
            validation: "url",
            path: ["website"],
            message: "Invalid url",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "website must be a valid url",
            code: "WebsiteIsUrlConstraint",
          },
        ]);
      });

      it("should handle date validation", () => {
        const zodError = new ZodError([
          {
            code: "invalid_type",
            expected: "date",
            received: "string",
            path: ["birthDate"],
            message: "Expected date, received string",
          } as ZodIssue,
        ]);

        const result = prettifier.prettify("zod", zodError);

        expect(result).toEqual([
          {
            message: "birthDate must be valid: Expected date, received string",
            code: "BirthDateIsDateConstraint",
          },
        ]);
      });
    });
  });

  describe("Integration scenarios", () => {
    it("should handle class-validator with multiple nested levels and constraints", () => {
      const errors: ValidationError[] = [
        {
          property: "order",
          children: [
            {
              property: "items",
              children: [
                {
                  property: "product",
                  children: [
                    {
                      property: "id",
                      constraints: {
                        isUuid: "id must be a UUID",
                        isNotEmpty: "id should not be empty",
                      },
                      children: [],
                    } as ValidationError,
                  ],
                } as ValidationError,
              ],
            } as ValidationError,
          ],
        } as ValidationError,
      ];

      const result = prettifier.prettify("class-validator", errors);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        message: "order.items.product.id must be a UUID",
        code: "OrderItemsProductIdIsUuidConstraint",
      });
      expect(result).toContainEqual({
        message: "order.items.product.id should not be empty",
        code: "OrderItemsProductIdIsNotEmptyConstraint",
      });
    });

    it("should handle zod with complex nested array structures", () => {
      const zodError = new ZodError([
        {
          code: "invalid_string",
          validation: "uuid",
          path: ["orders", 0, "items", 1, "productId"],
          message: "Invalid uuid",
        } as ZodIssue,
        {
          code: "too_small",
          minimum: 1,
          type: "number",
          inclusive: true,
          exact: false,
          path: ["orders", 0, "items", 1, "quantity"],
          message: "Number must be greater than or equal to 1",
        } as ZodIssue,
      ]);

      const result = prettifier.prettify("zod", zodError);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        message: "orders[0].items[1].productId must be a valid uuid",
        code: "OrdersItemsProductIdIsUuidConstraint",
      });
      expect(result).toContainEqual({
        message:
          "orders[0].items[1].quantity must be greater than or equal to 1",
        code: "OrdersItemsQuantityMinConstraint",
      });
    });
  });

  it("should handle field name not at start of message", () => {
    const errors: ValidationError[] = [
      {
        property: "user",
        children: [
          {
            property: "password",
            constraints: {
              matches: "password is too weak",
            },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError,
    ];

    const result = prettifier.prettify("class-validator", errors);

    expect(result).toEqual([
      {
        message: "user.password is too weak",
        code: "UserPasswordMatchesConstraint",
      },
    ]);
  });

  it("should handle field name appearing multiple times in message", () => {
    const errors: ValidationError[] = [
      {
        property: "data",
        children: [
          {
            property: "value",
            constraints: {
              custom: "value must match the expected value format",
            },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError,
    ];

    const result = prettifier.prettify("class-validator", errors);

    expect(result).toEqual([
      {
        message: "data.value must match the expected value format",
        code: "DataValueCustomConstraint",
      },
    ]);
  });

  it("should prepend path when field name is not found in message", () => {
    const errors: ValidationError[] = [
      {
        property: "user",
        children: [
          {
            property: "field",
            constraints: {
              custom: "This is invalid",
            },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError,
    ];

    const result = prettifier.prettify("class-validator", errors);

    expect(result).toEqual([
      {
        message: "user.field This is invalid",
        code: "UserFieldCustomConstraint",
      },
    ]);
  });

  // Testing Zod mapZodToConstraintName edge cases
  it("should handle invalid_type with unknown expected type", () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "unknown" as any,
        received: "string",
        path: ["field"],
        message: "Expected unknown, received string",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "field must be valid: Expected unknown, received string",
        code: "FieldInvalidTypeConstraint",
      },
    ]);
  });

  it("should handle too_small with unknown type", () => {
    const zodError = new ZodError([
      {
        code: "too_small",
        minimum: 5,
        type: "unknown" as any,
        inclusive: true,
        exact: false,
        path: ["field"],
        message: "Value is too small",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "field Value is too small",
        code: "FieldTooSmallConstraint",
      },
    ]);
  });

  it("should handle too_big with unknown type", () => {
    const zodError = new ZodError([
      {
        code: "too_big",
        maximum: 100,
        type: "unknown" as any,
        inclusive: true,
        exact: false,
        path: ["field"],
        message: "Value is too big",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "field Value is too big",
        code: "FieldTooBigConstraint",
      },
    ]);
  });

  it("should handle invalid_string with includes validation", () => {
    const zodError = new ZodError([
      {
        code: "invalid_string",
        validation: { includes: "test" } as any,
        path: ["text"],
        message: "Invalid string",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "text must be a valid string",
        code: "TextContainsConstraint",
      },
    ]);
  });

  it("should handle invalid_string with startsWith validation", () => {
    const zodError = new ZodError([
      {
        code: "invalid_string",
        validation: { startsWith: "prefix" } as any,
        path: ["code"],
        message: "Invalid string",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "code must be a valid string",
        code: "CodeStartsWithConstraint",
      },
    ]);
  });

  it("should handle invalid_string with endsWith validation", () => {
    const zodError = new ZodError([
      {
        code: "invalid_string",
        validation: { endsWith: "suffix" } as any,
        path: ["filename"],
        message: "Invalid string",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "filename must be a valid string",
        code: "FilenameEndsWithConstraint",
      },
    ]);
  });

  it("should handle invalid_string without specific validation", () => {
    const zodError = new ZodError([
      {
        code: "invalid_string",
        path: ["text"],
        message: "Invalid string format",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "text must be a valid string format",
        code: "TextInvalidStringConstraint",
      },
    ]);
  });

  it("should handle invalid_literal", () => {
    const zodError = new ZodError([
      {
        code: "invalid_literal",
        expected: "admin",
        path: ["role"],
        message: "Invalid literal value",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "role must be a valid literal value",
        code: "RoleEqualsConstraint",
      },
    ]);
  });

  it("should handle unrecognized_keys", () => {
    const zodError = new ZodError([
      {
        code: "unrecognized_keys",
        keys: ["extra"],
        path: [],
        message: "Unrecognized key(s) in object",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "Unrecognized key(s) in object",
        code: "UnrecognizedKeysConstraint",
      },
    ]);
  });

  it("should handle invalid_union", () => {
    const zodError = new ZodError([
      {
        code: "invalid_union",
        unionErrors: [],
        path: ["value"],
        message: "Invalid union value",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "value must be a valid union value",
        code: "ValueInvalidUnionConstraint",
      },
    ]);
  });

  it("should handle invalid_date", () => {
    const zodError = new ZodError([
      {
        code: "invalid_date",
        path: ["createdAt"],
        message: "Invalid date",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "createdAt must be a valid date",
        code: "CreatedAtIsDateConstraint",
      },
    ]);
  });

  it("should handle unknown zod error code", () => {
    const zodError = new ZodError([
      {
        code: "unknown_code" as any,
        path: ["field"],
        message: "Unknown error",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "field Unknown error",
        code: "FieldValidationConstraint",
      },
    ]);
  });

  it("should handle array type for invalid_type", () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "array",
        received: "string",
        path: ["items"],
        message: "Expected array, received string",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "items must be valid: Expected array, received string",
        code: "ItemsIsArrayConstraint",
      },
    ]);
  });

  it("should handle object type for invalid_type", () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "object",
        received: "string",
        path: ["data"],
        message: "Expected object, received string",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "data must be valid: Expected object, received string",
        code: "DataIsObjectConstraint",
      },
    ]);
  });

  it("should handle messages that don't match any pattern", () => {
    const zodError = new ZodError([
      {
        code: "custom",
        path: ["field"],
        message: "This is a completely custom error message",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "field This is a completely custom error message",
        code: "FieldCustomConstraint",
      },
    ]);
  });

  it("should handle too_big for numbers", () => {
    const zodError = new ZodError([
      {
        code: "too_big",
        maximum: 100,
        type: "number",
        inclusive: true,
        exact: false,
        path: ["score"],
        message: "Number must be less than or equal to 100",
      } as ZodIssue,
    ]);

    const result = prettifier.prettify("zod", zodError);

    expect(result).toEqual([
      {
        message: "score must be less than or equal to 100",
        code: "ScoreMaxConstraint",
      },
    ]);
  });
});
