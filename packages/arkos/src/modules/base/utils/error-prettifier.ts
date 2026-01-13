import { ValidationError } from "class-validator";
import { ZodError, ZodIssue } from "zod";
import { pascalCase } from "../../../utils/helpers/change-case.helpers";

/**
 * Prettified error result with consistent format
 */
export interface PrettifiedError {
  /** Human-readable error message */
  message: string;
  /** Field name + constraint type code (e.g., 'NameIsStringConstraint') */
  code: string;
}

/**
 * Supported validation library types
 */
export type ValidationLibrary = "class-validator" | "zod";

/**
 * ErrorPrettifier class for normalizing validation errors from class-validator and Zod
 * into a consistent format with field name + constraint code pattern.
 *
 * @example
 * ```typescript
 * const prettifier = new ErrorPrettifier();
 *
 * // Class-validator example
 * const classValidatorErrors = await validate(userDto);
 * const prettified = prettifier.prettify('class-validator', classValidatorErrors);
 * // [{ message: 'name must be a string', code: 'NameIsStringConstraint' }]
 *
 * // Zod example
 * try {
 *   schema.parse(data);
 * } catch (error) {
 *   const prettified = prettifier.prettify('zod', error);
 *   // [{ message: 'name must be a string', code: 'NameIsStringConstraint' }]
 * }
 *
 * // Nested errors
 * // [{ message: 'user.address.street must be a string', code: 'UserAddressStreetIsStringConstraint' }]
 * ```
 */
export class ErrorPrettifier {
  /**
   * Prettifies validation errors from class-validator or Zod into a consistent format.
   *
   * @param library - The validation library type ('class-validator' or 'zod')
   * @param error - The validation error(s) from the library
   * @returns Array of prettified errors with consistent message and code format
   */
  prettify(
    library: "class-validator",
    error: ValidationError[]
  ): PrettifiedError[];
  prettify(library: "zod", error: ZodError): PrettifiedError[];
  prettify(
    library: ValidationLibrary,
    error: ValidationError[] | ZodError
  ): PrettifiedError[] {
    if (library === "class-validator") {
      return this.prettifyClassValidator(error as ValidationError[]);
    } else {
      return this.prettifyZod(error as ZodError);
    }
  }

  /**
   * Converts a field path to PascalCase for code generation.
   *
   * @example
   * ```typescript
   * toPascalCase('user.address.street') // 'UserAddressStreet'
   * toPascalCase('email') // 'Email'
   * ```
   *
   * @param path - Dot-separated field path
   * @returns PascalCase version of the path
   */
  private toPascalCase(path: string): string {
    return path
      .split(".")
      .map((part) => pascalCase(part))
      .join("");
  }

  /**
   * Replaces the field name in the validation message with the full path.
   * Handles array indices like tags[0] and nested paths like user.address.street.
   *
   * @example
   * ```typescript
   * replaceFieldInMessage('id must be a UUID', 'id', 'user.id')
   * // Returns: 'user.id must be a UUID'
   *
   * replaceFieldInMessage('name must be a string', 'name', 'tags[0].name')
   * // Returns: 'tags[0].name must be a string'
   * ```
   *
   * @param message - Original validation message
   * @param fieldName - Original field name
   * @param fullPath - Full path including parent properties
   * @returns Message with field name replaced by full path
   */
  private replaceFieldInMessage(
    message: string,
    fieldName: string,
    fullPath: string
  ): string {
    // If it's a top-level field (no dots or brackets), return original message
    if (!fullPath.includes(".") && !fullPath.includes("[")) {
      return message;
    }

    // Replace the field name at the start of the message with the full path
    // Handle cases like "id must be a UUID" -> "user.id must be a UUID"
    const regex = new RegExp(`^${fieldName}\\b`, "i");
    if (regex.test(message)) {
      return message.replace(regex, fullPath);
    }

    // If field name is not at the start, try to find it and replace
    // This handles cases like "must be a valid id" or other formats
    const wordBoundaryRegex = new RegExp(`\\b${fieldName}\\b`, "gi");
    if (wordBoundaryRegex.test(message)) {
      return message.replace(wordBoundaryRegex, fullPath);
    }

    // If we can't find the field name in the message, prepend the path
    return `${fullPath} ${message}`;
  }

  /**
   * Prettifies class-validator ValidationError array.
   * Handles nested validation errors recursively.
   *
   * @param errors - Array of ValidationError from class-validator
   * @param parentPath - Parent path for nested errors (used internally)
   * @returns Array of prettified errors
   */
  private prettifyClassValidator(
    errors: ValidationError[],
    parentPath: string = ""
  ): PrettifiedError[] {
    const result: PrettifiedError[] = [];

    for (const error of errors) {
      const currentPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.children && error.children.length > 0) {
        result.push(
          ...this.prettifyClassValidator(error.children, currentPath)
        );
        continue;
      }

      if (error.constraints) {
        const fieldPascal = this.toPascalCase(currentPath);

        for (const [constraintKey, originalMessage] of Object.entries(
          error.constraints
        )) {
          const constraintName =
            constraintKey.charAt(0).toUpperCase() + constraintKey.slice(1);

          const message = this.replaceFieldInMessage(
            originalMessage,
            error.property,
            currentPath
          );

          result.push({
            message: message,
            code: `${fieldPascal}${constraintName}Constraint`,
          });
        }
      }
    }

    return result;
  }

  /**
   * Maps Zod error codes and validation info to class-validator style constraint names.
   *
   * @param issue - Zod validation issue
   * @returns Class-validator style constraint name
   */
  private mapZodToConstraintName(issue: ZodIssue): string {
    switch (issue.code) {
      case "invalid_type":
        const expected = issue.expected;
        switch (expected) {
          case "string":
            return "IsStringConstraint";
          case "number":
            return "IsNumberConstraint";
          case "boolean":
            return "IsBooleanConstraint";
          case "array":
            return "IsArrayConstraint";
          case "object":
            return "IsObjectConstraint";
          case "date":
            return "IsDateConstraint";
          default:
            return "InvalidTypeConstraint";
        }

      case "too_small":
        if (issue.type === "string") {
          return "MinLengthConstraint";
        } else if (issue.type === "number") {
          return "MinConstraint";
        } else if (issue.type === "array") {
          return "ArrayMinSizeConstraint";
        }
        return "TooSmallConstraint";

      case "too_big":
        if (issue.type === "string") {
          return "MaxLengthConstraint";
        } else if (issue.type === "number") {
          return "MaxConstraint";
        } else if (issue.type === "array") {
          return "ArrayMaxSizeConstraint";
        }
        return "TooBigConstraint";

      case "invalid_string":
        if ("validation" in issue) {
          const validation = issue.validation;
          if (validation === "email") return "IsEmailConstraint";
          if (validation === "uuid") return "IsUuidConstraint";
          if (validation === "url") return "IsUrlConstraint";
          if (typeof validation === "object" && "includes" in validation)
            return "ContainsConstraint";
          if (typeof validation === "object" && "startsWith" in validation)
            return "StartsWithConstraint";
          if (typeof validation === "object" && "endsWith" in validation)
            return "EndsWithConstraint";
        }
        return "InvalidStringConstraint";

      case "invalid_enum_value":
        return "IsEnumConstraint";

      case "invalid_literal":
        return "EqualsConstraint";

      case "unrecognized_keys":
        return "UnrecognizedKeysConstraint";

      case "invalid_union":
        return "InvalidUnionConstraint";

      case "invalid_date":
        return "IsDateConstraint";

      case "custom":
        return "CustomConstraint";

      default:
        return "ValidationConstraint";
    }
  }

  /**
   * Prettifies Zod ZodError.
   * Handles nested paths and multiple issues per field.
   *
   * @param error - ZodError from Zod validation
   * @returns Array of prettified errors
   */
  private prettifyZod(error: ZodError): PrettifiedError[] {
    const result: PrettifiedError[] = [];

    for (const issue of error.issues) {
      // Build the field path from the issue path
      const fieldPath = issue.path
        .map((segment, index) => {
          // Handle array indices: convert to bracket notation
          if (typeof segment === "number") {
            return `[${segment}]`;
          }
          // First segment doesn't need a dot prefix
          return index === 0 ? segment : `.${segment}`;
        })
        .join("")
        .replace(/\.\[/g, "["); // Clean up .[ to just [

      const fieldPascal = fieldPath
        ? this.toPascalCase(fieldPath.replace(/\[\d+\]/g, ""))
        : "";

      // Map Zod error code to constraint name
      const constraintName = this.mapZodToConstraintName(issue);

      // Inject the field path into the message naturally
      const message = this.injectFieldPathInZodMessage(
        issue.message,
        fieldPath,
        issue
      );

      result.push({
        message: message,
        code: `${fieldPascal}${constraintName}`,
      });
    }

    return result;
  }

  /**
   * Injects the field path into Zod error messages naturally.
   *
   * @example
   * ```typescript
   * injectFieldPathInZodMessage('String must contain at least 100 character(s)', 'user.id', issue)
   * // Returns: 'user.id must contain at least 100 character(s)'
   *
   * injectFieldPathInZodMessage('Required', 'email', issue)
   * // Returns: 'email is required'
   * ```
   *
   * @param message - Original Zod error message
   * @param fieldPath - Full field path (e.g., 'user.id', 'tags[0].name')
   * @param issue - Zod issue for context
   * @returns Message with field path injected naturally
   */
  private injectFieldPathInZodMessage(
    message: string,
    fieldPath: string,
    issue: ZodIssue
  ): string {
    if (!fieldPath) {
      return message;
    }

    // "Required" -> "fieldPath is required"
    if (message === "Required") {
      return `${fieldPath} is required`;
    }

    // "String must..." -> "fieldPath must..."
    if (message.startsWith("String must")) {
      return message.replace(/^String must/, `${fieldPath} must`);
    }

    // "Number must..." -> "fieldPath must..."
    if (message.startsWith("Number must")) {
      return message.replace(/^Number must/, `${fieldPath} must`);
    }

    // "Array must..." -> "fieldPath must..."
    if (message.startsWith("Array must")) {
      return message.replace(/^Array must/, `${fieldPath} must`);
    }

    // "Expected string, received number" -> "fieldPath: Expected string, received number"
    if (message.startsWith("Expected")) {
      return `${fieldPath} must be valid: ${message}`;
    }

    // "Invalid email" -> "fieldPath must be a valid email"
    if (message.startsWith("Invalid ")) {
      const type = message.replace("Invalid ", "").toLowerCase();
      return `${fieldPath} must be a valid ${type}`;
    }

    // For any other message, return the message
    if (!message.toLowerCase().includes(fieldPath.toLowerCase()))
      return `${fieldPath} ${message}`;
    return message;
  }
}

const errorPrettifier = new ErrorPrettifier();

export default errorPrettifier;
