import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { capitalize } from "../../../../helpers/text.helpers";
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
    // Create: {
    //   roles: [],
    //   name: "Create ${capitalize(modelName.kebab.replaceAll("-", ""))}",
    //   description: "Permission to create new ${modelName.kebab.replaceAll("-", " ")} records"
    // },
    // Update: {
    //   roles: [],
    //   name: "Update ${capitalize(modelName.kebab.replaceAll("-", ""))}",
    //   description: "Permission to update existing ${modelName.kebab.replaceAll("-", " ")} records"
    // },
    // Delete: {
    //   roles: [],
    //   name: "Delete ${capitalize(modelName.kebab.replaceAll("-", ""))}",
    //   description: "Permission to delete ${modelName.kebab.replaceAll("-", " ")} records"
    // },
    // View: {
    //   roles: [],
    //   name: "View ${capitalize(modelName.kebab.replaceAll("-", ""))}",
    //   description: "Permission to view ${modelName.kebab.replaceAll("-", " ")} records"
    // },
  },
};

export default ${modelName.camel}AuthConfigs;
`;
}
