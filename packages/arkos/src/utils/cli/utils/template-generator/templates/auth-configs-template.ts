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
    ? `import { AuthConfigs } from 'arkos/auth';\n`
    : "";

  // Generate type annotation for TypeScript
  const typeAnnotation = isTypeScript ? `: AuthConfigs` : "";

  return `${imports}
import { authService } from "arkos/services";

export const ${modelName.camel}Permissions = {
  canCreate: authService.permission("Create", "${modelName.kebab}"),
  canUpdate: authService.permission("Update", "${modelName.kebab}"),
  canDelete: authService.permission("Delete", "${modelName.kebab}"),
  canView: authService.permission("View", "${modelName.kebab}"),
}

const ${modelName.camel}AuthConfigs${typeAnnotation} = {
  authenticationControl: {
    Create: true,
    Update: true,
    Delete: true,
    View: true,
  },
  accessControl: {
    // Create: [],
    // Update: [],
    // Delete: [],
    // View: [],
  },
};

export default ${modelName.camel}AuthConfigs;
`;
}
