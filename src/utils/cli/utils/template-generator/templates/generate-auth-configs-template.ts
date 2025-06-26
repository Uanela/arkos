import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateAuthConfigsTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Model name is required for auth config template");

  // Generate imports for TypeScript
  const imports = isTypeScript
    ? `import { AuthConfigs } from 'arkos/prisma';\n`
    : "";

  // Generate type annotation for TypeScript
  const typeAnnotation = isTypeScript ? `: AuthConfigs` : "";

  return `${imports}
const ${modelName.camel}AuthConfigs${typeAnnotation} = {
  authenticationControl: {
    // Create: true,
    // Update: true,
    // Delete: true,
    // View: false,
  },
  
  // Only when using Static RBAC
  accessControl: {
    // Create: ["Admin"],
    // Update: ["Admin", "Manager"],
    // Delete: ["Admin"],
    // View: ["User", "Admin", "Guest"],
  },
};

export default ${modelName.camel}AuthConfigs;
`;
}
