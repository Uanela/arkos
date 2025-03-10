/**
 * Configuration types for field type mapping
 */
interface FieldConfig {
  dateFields: string[]
  booleanFields: string[]
  numericFields: string[]
}

/**
 * Type for the structured filter object returned by the parser
 */
type ParsedFilter = {
  [key: string]: any
  orderBy?: Record<string, 'asc' | 'desc'>
  OR?: Record<string, any>[]
}

/**
 * Default configuration for field types
 */
const DEFAULT_FIELD_CONFIG: FieldConfig = {
  dateFields: ['createdAt', 'updatedAt', 'deletedAt', 'date'],
  booleanFields: ['isActive', 'isDeleted', 'isPublished', 'isArchived'],
  numericFields: ['age', 'price', 'quantity', 'amount', 'rating'],
}

/**
 * Parses query parameters into a structured filter object compatible with Prisma queries.
 * Supports various operators and data type conversions.
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
  // excludedFields: string[],
  fieldConfig: FieldConfig = DEFAULT_FIELD_CONFIG
): ParsedFilter {
  const queryObj = JSON.parse(JSON.stringify(query))
  // excludedFields.forEach((el) => delete queryObj[el])

  return Object.entries(JSON.parse(JSON.stringify(query))).reduce(
    (acc, [key, value]) => {
      if (!value) return acc

      // Convert value to string if it's not already
      const stringValue = Array.isArray(value)
        ? value[0]?.toString()
        : value.toString()
      const parts = key.split('__')
      if (parts.length < 2) {
        acc[key] = value
        return acc
      }
      const fieldName = parts[0]

      // Handle ordering
      if (fieldName === 'orderBy' && parts.length === 2) {
        if (!acc.orderBy) acc.orderBy = {}
        acc.orderBy[parts[1]] = stringValue as 'asc' | 'desc'
        return acc
      }

      // Handle simple equals case
      if (parts.length === 1) {
        acc[fieldName] = {
          equals: convertValue(stringValue, fieldName, 'equals', fieldConfig),
        }
        return acc
      }

      let currentLevel = acc
      let currentKey = fieldName

      // Build nested structure
      for (let i = 1; i < parts.length - 1; i++) {
        if (!currentLevel[currentKey]) {
          currentLevel[currentKey] = {}
        }
        currentLevel = currentLevel[currentKey]
        currentKey = parts[i]
      }

      const lastOperator = parts[parts.length - 1]

      // Handle special operators
      switch (lastOperator) {
        case 'icontains':
          currentLevel[currentKey] = {
            contains: stringValue,
            mode: 'insensitive',
          }
          break

        case 'contains':
          currentLevel[currentKey] = {
            contains: stringValue,
            mode: 'sensitive',
          }
          break

        case 'in':
        case 'notIn':
          currentLevel[currentKey] = {
            [lastOperator]: stringValue
              .split(',')
              .map((v: string) =>
                convertValue(v.trim(), fieldName, lastOperator, fieldConfig)
              ),
          }
          break

        case 'or':
          const values: string[] = stringValue.split(',')
          if (!acc.OR) acc.OR = []
          acc.OR.push(
            ...values.map((val) => ({
              [fieldName]: {
                equals: convertValue(
                  val.trim(),
                  fieldName,
                  'equals',
                  fieldConfig
                ),
              },
            }))
          )
          break

        case 'isNull':
          currentLevel[currentKey] = {
            equals: stringValue.toLowerCase() === 'true' ? null : undefined,
          }
          break

        case 'isEmpty':
          currentLevel[currentKey] = {
            equals: stringValue.toLowerCase() === 'true' ? '' : undefined,
          }
          break

        default:
          currentLevel[currentKey] = {
            [lastOperator]: convertValue(
              stringValue,
              fieldName,
              lastOperator,
              fieldConfig
            ),
          }
      }

      return acc
    },
    {} as ParsedFilter
  )
}

/**
 * Converts string values to appropriate types based on field configuration
 */
function convertValue(
  value: string,
  fieldName: string,
  operator: string,
  config: FieldConfig
): any {
  // Handle date fields
  if (config.dateFields.includes(fieldName)) {
    return new Date(value)
  }

  // Handle boolean fields
  if (config.booleanFields.includes(fieldName)) {
    return value.toLowerCase() === 'true'
  }

  // Handle numeric fields
  if (config.numericFields.includes(fieldName)) {
    return Number(value)
  }

  return value
}

// Example usage:
/*
  const query = {
    name__not__equals: 'uanela',
    email__contains: 'example.com',
    description__icontains: 'test',
    age__gt: '25',
    status: 'active',
    tags__in: 'tag1,tag2,tag3',
    createdAt__gt: '2024-01-01',
    isActive: 'true',
    orderBy__createdAt: 'desc'
  };
  
  const result = parseQueryParamsWithModifiers(query);
  */
