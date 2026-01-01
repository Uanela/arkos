import deepmerge from "./deepmerge.helper";

function parseKey(key: string): { fields: string[]; operator: string | null } {
  const fields: string[] = [];
  let i = 0;

  while (i < key.length) {
    if (key[i] === "_" && key[i + 1] === "_") {
      i += 2;
      continue;
    }

    if (key[i] === "[") {
      const closingBracket = key.indexOf("]", i);
      if (closingBracket === -1) break;

      const bracketContent = key.substring(i + 1, closingBracket);
      if (bracketContent) {
        fields.push(bracketContent);
      }
      i = closingBracket + 1;
      continue;
    }

    let nextDelimiter = key.length;
    const nextUnderscore = key.indexOf("__", i);
    const nextBracket = key.indexOf("[", i);

    if (nextUnderscore !== -1 && nextUnderscore < nextDelimiter) {
      nextDelimiter = nextUnderscore;
    }
    if (nextBracket !== -1 && nextBracket < nextDelimiter) {
      nextDelimiter = nextBracket;
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
  if (possibleOperators.includes(lastField)) {
    const operator = fields.pop()!;
    return { fields, operator };
  }

  return { fields, operator: null };
}

function buildNestedObject(
  fields: string[],
  operator: string | null,
  value: any,
  fieldConfig: FieldConfig
): any {
  if (fields.length === 0) return {};

  const firstField = fields[0];

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

        current[fields[fields.length - 1]] = {
          equals: convertValue(
            typeof val === "string" ? val.trim() : val,
            fields[0],
            fieldConfig
          ),
        };

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

  const lastField = fields[fields.length - 1];

  if (!operator) {
    current[lastField] = {
      equals: convertValue(value, fields[0], fieldConfig),
    };
    return result;
  }

  const stringValue = typeof value === "string" ? value : value?.toString();

  switch (operator) {
    case "icontains":
      current[lastField] = {
        contains: stringValue,
        mode: "insensitive",
      };
      break;

    case "contains":
      current[lastField] = {
        contains: stringValue,
        mode: "sensitive",
      };
      break;

    case "in":
    case "notIn":
      const inValues = Array.isArray(value) ? value : stringValue.split(",");

      current[lastField] = {
        [operator]: inValues.map((v: any) =>
          convertValue(
            typeof v === "string" ? v.trim() : v,
            fields[0],
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
            fields[0],
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
            : convertValue(stringValue, fields[0], fieldConfig),
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
 *
 * @example
 * // Basic usage
 * parseQueryParamsWithModifiers({ name__contains: 'john' })
 * // => { name: { contains: 'john', mode: 'sensitive' } }
 *
 * @example
 * // Deep merge example
 * parseQueryParamsWithModifiers({
 *   'some__data': '1',
 *   'some__info': '2'
 * })
 * // => { some: { data: '1', info: '2' } }
 *
 * @example
 * // Complex query
 * parseQueryParamsWithModifiers({
 *   name__not__equals: 'john',
 *   age__gt: '25',
 *   tags__in: 'tag1,tag2',
 *   orderBy__createdAt: 'desc'
 * })
 */
export function parseQueryParamsWithModifiers(
  query: Record<string, any>,
  fieldConfig: FieldConfig = DEFAULT_FIELD_CONFIG
): ParsedFilter {
  const entries = Object.entries(JSON.parse(JSON.stringify(query)));
  let result: ParsedFilter = {};

  for (const [key, value] of entries) {
    if (value === undefined) continue;

    const { fields, operator } = parseKey(key);

    if (fields.length === 0) continue;

    const currentResult = buildNestedObject(
      fields,
      operator,
      value,
      fieldConfig
    );
    result = deepmerge(result, currentResult);
  }

  return result;
}

/**
 * Converts string values to appropriate types based on field configuration
 *
 * @example
 * // Example usage:
 * const query = {
 *   name__not__equals: 'uanela',
 *   email__contains: 'example.com',
 *   description__icontains: 'test',
 *   age__gt: '25',
 *   status: 'active',
 *   tags__in: 'tag1,tag2,tag3',
 *   createdAt__gt: '2024-01-01',
 *   isActive: 'true',
 *   orderBy__createdAt: 'desc',
 *   some__data: '1',
 *   some__info: '2'
 * };
 *
 * const result = parseQueryParamsWithModifiers(query);
 * // Result will properly merge nested objects instead of overwriting
 */
function convertValue(
  value: string,
  fieldName: string,
  config: FieldConfig
): any {
  if (typeof value !== "string") {
    return value;
  }

  if (config.dateFields?.includes?.(fieldName) && value) {
    return new Date(value);
  }

  if (config.booleanFields?.includes?.(fieldName)) {
    return value.toLowerCase() === "true";
  }

  if (config.numericFields?.includes?.(fieldName)) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  return value;
}
