import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateServiceTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for service template");

  // Generate imports
  const prismaImport = isTypeScript
    ? `"../../utils/prisma${ext === "ts" ? "" : "." + "js"}";\n`
    : "";

  const baseServiceImport = isTypeScript
    ? `import { BaseService } from "${
        imports?.baseService || "arkos/services"
      }";`
    : `import { BaseService } from "${
        imports?.baseService || "arkos/services"
      }";`;

  // Generate type parameter for TypeScript
  const typeParameter = isTypeScript
    ? `<typeof prisma.${modelName.camel}>`
    : "";

  return `${isTypeScript && "import prisma from "}${prismaImport}${baseServiceImport}
  
class ${modelName.pascal}Service extends BaseService${typeParameter} {}

const ${modelName.camel}Service = new ${modelName.pascal}Service("${modelName.kebab}");

export default ${modelName.camel}Service;
`;
}
