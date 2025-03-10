import * as fs from 'fs'
import * as path from 'path'

const SCHEMA_FOLDER_PATH = './prisma/schema'

function getAllSchemaContent(): string {
  const files = fs
    .readdirSync(SCHEMA_FOLDER_PATH)
    .filter((file) => file.endsWith('.prisma'))

  let combinedSchema = ''
  for (const file of files) {
    const filePath = path.join(SCHEMA_FOLDER_PATH, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    combinedSchema += '\n' + content
  }

  return combinedSchema
}

function isFieldDefinition(line: string): boolean {
  // Ignore lines that start with @@ (model attributes)
  if (line.trim().startsWith('@@')) return false

  // Ignore empty lines and comments
  if (!line.trim() || line.trim().startsWith('//')) return false

  // Must start with a valid field name (letter or underscore)
  if (!/^\s*[a-zA-Z_]\w*\s/.test(line)) return false

  // Must have at least a name and type
  const parts = line.trim().split(/\s+/)
  if (parts.length < 2) return false

  return true
}

function parseFieldType(fieldType: string, line: string): string {
  // Remove any ? or [] from the type for the switch
  const baseType = fieldType.replace('?', '').replace('[]', '')
  const isArray = fieldType.includes('[]')

  // If it's a relation (has @relation), keep the original type
  if (line.includes('@relation')) {
    return isArray ? `${baseType}[]` : baseType
  }

  // Convert Prisma scalar types to TypeScript types
  let tsType = baseType
  switch (baseType) {
    case 'String':
      tsType = 'string'
      break
    case 'Int':
    case 'Float':
    case 'Decimal':
      tsType = 'number'
      break
    case 'Boolean':
      tsType = 'boolean'
      break
    case 'DateTime':
      tsType = 'Date'
      break
    case 'Json':
      tsType = 'any'
      break
    case 'BigInt':
      tsType = 'bigint'
      break
    case 'Bytes':
      tsType = 'Buffer'
      break
  }

  return isArray ? `${tsType}[]` : tsType
}

function generateTypes() {
  const schemaContent = getAllSchemaContent()

  let typeDefinitions = `// Auto-generated types from Prisma Schema\n\n`

  // Generate enum types
  const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g
  let enumMatch
  while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
    const [_, enumName, enumContent] = enumMatch
    const values = enumContent
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    typeDefinitions += `export enum ${enumName} {\n`
    values.forEach((value) => {
      typeDefinitions += `  ${value} = "${value}",\n`
    })
    typeDefinitions += `}\n\n`
  }

  // Generate interface types
  const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g
  let modelMatch
  while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const [_, modelName, modelContent] = modelMatch

    typeDefinitions += `export interface ${modelName} {\n`

    const lines = modelContent.split('\n')
    for (const line of lines) {
      if (!isFieldDefinition(line)) continue

      const parts = line.trim().split(/\s+/)
      const fieldName = parts[0]
      const fieldType = parts[1]

      const isOptional = line.includes('?')
      const parsedType = parseFieldType(fieldType, line)

      typeDefinitions += `  ${fieldName}${
        isOptional ? '?' : ''
      }: ${parsedType};\n`
    }

    typeDefinitions += `}\n\n`
  }

  const outputDir = path.join(process.cwd(), '.cache/types')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, 'prisma.ts')
  fs.writeFileSync(outputPath, typeDefinitions)
  console.log('Types generated successfully at:', outputPath)
}

// Run the type generator
generateTypes()
