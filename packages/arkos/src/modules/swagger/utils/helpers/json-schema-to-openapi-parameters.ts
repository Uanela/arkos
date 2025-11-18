export default function jsonSchemaToOpeApiParameters(
  paramType: string,
  schema: any,
  prefix = ""
): any[] {
  const params = [];

  if (schema.type === "object" && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties) as any) {
      const paramName = prefix ? `${prefix}[${key}]` : key;

      if (value.type === "object" && value.properties) {
        params.push(
          ...jsonSchemaToOpeApiParameters(paramType, value, paramName)
        );
      } else {
        params.push({
          in: paramType,
          name: paramName,
          required: schema.required?.includes(key) || false,
          schema: {
            type: value.type,
            ...(value.enum && { enum: value.enum }),
            ...(value.format && { format: value.format }),
          },
        });
      }
    }
  }

  return params;
}
