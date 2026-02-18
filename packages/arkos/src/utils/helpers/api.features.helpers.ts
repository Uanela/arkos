import deepmerge from "./deepmerge.helper";
import prismaSchemaParser from "../prisma/prisma-schema-parser";

function parseNestedObject(
  key: string,
  value: any
): { fields: string[]; operator: string | null; value: any }[] {
  const results: { fields: string[]; operator: string | null; value: any }[] =
    [];

  function traverse(obj: any, path: string[] = []) {
    for (const [k, v] of Object.entries(obj)) {
      if (k.includes("__")) {
        const parsedKey = parseKeyString(k);
        const basePath =
          v && typeof v === "object" && !Array.isArray(v) && parsedKey.operator
            ? [...path, ...parsedKey.fields, parsedKey.operator]
            : [...path, ...parsedKey.fields];

        if (v && typeof v === "object" && !Array.isArray(v))
          traverse(v, basePath);
        else
          results.push({
            fields: basePath,
            operator: parsedKey.operator,
            value: v,
          });
      } else {
        const currentPath = [...path, k];

        if (v && typeof v === "object" && !Array.isArray(v)) {
          traverse(v, currentPath);
        } else {
          const lastPart = currentPath[currentPath.length - 1];
          const possibleOperators = [
            "icontains",
            "contains",
            "in",
            "notIn",
            "hasSome",
            "hasEvery",
            "or",
            "isNull",
            "isEmpty",
            "gt",
            "gte",
            "lt",
            "lte",
            "equals",
            "startsWith",
            "endsWith",
            "not",
            "some",
            "none",
            "every",
          ];

          let operator: string | null = null;
          let fields = [...currentPath];

          if (possibleOperators.includes(lastPart)) {
            operator = lastPart;
            fields = currentPath.slice(0, -1);
          }

          results.push({ fields, operator, value: v });
        }
      }
    }
  }

  traverse({ [key]: value });
  return results;
}

function parseKey(
  key: string,
  value: any
): { fields: string[]; operator: string | null; value: any }[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (key.includes("__")) {
      const parsedKey = parseKeyString(key);

      const basePath = parsedKey.operator
        ? [...parsedKey.fields, parsedKey.operator]
        : parsedKey.fields;

      const results: {
        fields: string[];
        operator: string | null;
        value: any;
      }[] = [];

      function traverse(obj: any, path: string[] = []) {
        for (const [k, v] of Object.entries(obj)) {
          if (k.includes("__")) {
            const innerParsedKey = parseKeyString(k);
            const basePath =
              v &&
              typeof v === "object" &&
              !Array.isArray(v) &&
              innerParsedKey.operator
                ? [...path, ...innerParsedKey.fields, innerParsedKey.operator]
                : [...path, ...innerParsedKey.fields];

            if (v && typeof v === "object" && !Array.isArray(v)) {
              traverse(v, basePath);
            } else {
              results.push({
                fields: basePath,
                operator: innerParsedKey.operator,
                value: v,
              });
            }
          } else {
            const currentPath = [...path, k];

            if (v && typeof v === "object" && !Array.isArray(v)) {
              traverse(v, currentPath);
            } else {
              const possibleOperators = [
                "icontains",
                "contains",
                "in",
                "notIn",
                "hasSome",
                "hasEvery",
                "or",
                "isNull",
                "isEmpty",
                "gt",
                "gte",
                "lt",
                "lte",
                "equals",
                "startsWith",
                "endsWith",
                "not",
                "some",
                "none",
                "every",
              ];

              let operator: string | null = null;
              let fields = [...currentPath];

              if (possibleOperators.includes(k)) {
                operator = k;
                fields = currentPath.slice(0, -1);
              }

              results.push({ fields, operator, value: v });
            }
          }
        }
      }

      traverse(value, basePath);
      return results;
    }

    return parseNestedObject(key, value);
  }

  const parsedKey = parseKeyString(key);
  return [{ fields: parsedKey.fields, operator: parsedKey.operator, value }];
}

function parseKeyString(key: string): {
  fields: string[];
  operator: string | null;
} {
  const fields: string[] = [];
  let i = 0;

  while (i < key.length) {
    if (key[i] === "_" && key[i + 1] === "_") {
      i += 2;
      continue;
    }

    let nextDelimiter = key.length;
    const nextUnderscore = key.indexOf("__", i);

    if (nextUnderscore !== -1 && nextUnderscore < nextDelimiter) {
      nextDelimiter = nextUnderscore;
    }

    const fieldName = key.substring(i, nextDelimiter);
    if (fieldName) {
      fields.push(fieldName);
    }
    i = nextDelimiter;
  }

  if (fields.length === 0) return { fields: [], operator: null };

  const possibleOperators = [
    "icontains",
    "contains",
    "in",
    "notIn",
    "hasSome",
    "hasEvery",
    "or",
    "isNull",
    "isEmpty",
    "gt",
    "gte",
    "lt",
    "lte",
    "equals",
    "startsWith",
    "endsWith",
    "not",
    "some",
    "none",
    "every",
  ];

  const lastField = fields[fields.length - 1];
  let operator: string | null = null;
  let finalFields = fields;

  if (possibleOperators.includes(lastField)) {
    operator = lastField;
    finalFields = fields.slice(0, -1);
  }

  return { fields: finalFields, operator };
}

function buildNestedObject(
  fields: string[],
  operator: string | null,
  value: any,
  fieldConfig: FieldConfig
): any {
  if (fields.length === 0) return {};

  const firstField = fields[0];
  const lastField = fields[fields.length - 1];

  if (firstField === "orderBy" && fields.length === 2 && !operator) {
    return {
      orderBy: {
        [fields[1]]: value as "asc" | "desc",
      },
    };
  }

  if (fields.length === 1 && !operator) {
    if (typeof value === "object" && value !== null) {
      return { [firstField]: value };
    }

    const convertedValue =
      typeof value === "string"
        ? convertValue(value, firstField, fieldConfig)
        : value;
    return { [firstField]: convertedValue };
  }

  if (operator === "or") {
    const values = Array.isArray(value) ? value : value.toString().split(",");

    return {
      OR: values.map((val: any) => {
        const nested: any = {};
        let current = nested;

        for (let i = 0; i < fields.length - 1; i++) {
          current[fields[i]] = {};
          current = current[fields[i]];
        }

        current[lastField] = convertValue(
          typeof val === "string" ? val.trim() : val,
          lastField,
          fieldConfig
        );

        return nested;
      }),
    };
  }

  const result: any = {};
  let current = result;

  for (let i = 0; i < fields.length - 1; i++) {
    current[fields[i]] = {};
    current = current[fields[i]];
  }

  if (!operator) {
    current[lastField] = convertValue(value, lastField, fieldConfig);
    return result;
  }

  const stringValue = typeof value === "string" ? value : value?.toString();

  switch (operator) {
    case "icontains":
      current[lastField] = {
        contains: stringValue,
        mode: "insensitive",
      };
      if (
        !["mongodb", "postgresql"].includes(
          prismaSchemaParser.config.datasourceProvider
        )
      )
        delete current[lastField].mode;
      break;

    case "contains":
      current[lastField] = {
        contains: stringValue,
        mode: "sensitive",
      };
      if (
        !["mongodb", "postgresql"].includes(
          prismaSchemaParser.config.datasourceProvider
        )
      )
        delete current[lastField].mode;
      break;

    case "in":
    case "notIn":
      const inValues = Array.isArray(value) ? value : stringValue.split(",");
      current[lastField] = {
        [operator]: inValues.map((v: any) =>
          convertValue(
            typeof v === "string" ? v.trim() : v,
            lastField,
            fieldConfig
          )
        ),
      };
      break;

    case "hasSome":
    case "hasEvery":
      const arrayValues = Array.isArray(value) ? value : stringValue.split(",");
      current[lastField] = {
        [operator]: arrayValues.map((v: any) =>
          convertValue(
            typeof v === "string" ? v.trim() : v,
            lastField,
            fieldConfig
          )
        ),
      };
      break;

    case "isNull":
      current[lastField] = {
        equals: stringValue?.toLowerCase() === "true" ? null : undefined,
      };
      break;

    case "isEmpty":
      current[lastField] = {
        equals: stringValue?.toLowerCase() === "true" ? "" : undefined,
      };
      break;

    default:
      current[lastField] = {
        [operator]:
          value === null
            ? null
            : convertValue(stringValue, lastField, fieldConfig),
      };
  }

  return result;
}

/**
 * Configuration types for field type mapping
 */
interface FieldConfig {
  dateFields: string[];
  booleanFields: string[];
  numericFields: string[];
}

/**
 * Type for the structured filter object returned by the parser
 */
type ParsedFilter = {
  [key: string]: any;
  orderBy?: Record<string, "asc" | "desc">;
  OR?: Record<string, any>[];
};

/**
 * Default configuration for field types
 */
const DEFAULT_FIELD_CONFIG: FieldConfig = {
  dateFields: ["createdAt", "updatedAt", "deletedAt", "date"],
  booleanFields: ["isActive", "isDeleted", "isPublished", "isArchived"],
  numericFields: ["age", "price", "quantity", "amount", "rating"],
};

/**
 * Parses query parameters into a structured filter object compatible with Prisma queries.
 * Supports various operators and data type conversions with deep merge strategy.
 *
 * @param query - Object containing query parameters
 * @param fieldConfig - Optional configuration for field type mapping
 * @returns Structured filter object for database queries
 */
export function parseQueryParamsWithModifiers(
  query: Record<string, any>,
  fieldConfig: FieldConfig = DEFAULT_FIELD_CONFIG
): ParsedFilter {
  const entries = Object.entries(JSON.parse(JSON.stringify(query)));
  let result: ParsedFilter = {};

  for (const [key, value] of entries) {
    if (value === undefined) continue;

    const parsedItems = parseKey(key, value);

    for (const { fields, operator, value: val } of parsedItems) {
      if (fields.length === 0) continue;

      const currentResult = buildNestedObject(
        fields,
        operator,
        val,
        fieldConfig
      );
      result = deepmerge(result, currentResult);
    }
  }

  return result;
}

/**
 * Converts string values to appropriate types based on field configuration
 */
function convertValue(
  value: string,
  fieldName: string,
  config: FieldConfig
): any {
  if (typeof value !== "string") return value;

  if (config.dateFields?.includes?.(fieldName) && value) return new Date(value);

  if (config.booleanFields?.includes?.(fieldName))
    return value.toLowerCase() === "true";

  if (config.numericFields?.includes?.(fieldName)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  return value;
}
