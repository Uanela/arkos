import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { capitalize } from "../../../../helpers/text.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateAuthConfigsTemplate(
  options: TemplateOptions & { advanced?: boolean }
): string {
  const { modelName, advanced = false } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Module name is required for auth config template");

  const modelNameCapitalized = capitalize(modelName.kebab.replaceAll("-", " "));
  const modelNameSpaced = modelName.kebab.replaceAll("-", " ");

  const imports = isTypeScript
    ? `import { AuthConfigs } from 'arkos/auth';\n`
    : "";

  const typeSatisfies = isTypeScript
    ? ` as const satisfies AuthConfigs["accessControl"]`
    : "";

  const helperFunction = advanced
    ? ``
    : `
function create${modelName.pascal}Permission(action${isTypeScript ? ": string" : ""}) {
  return authService.permission(action, "${modelName.kebab}", ${modelName.camel}AccessControl);
}`;

  const permissions = advanced
    ? `
${
  isTypeScript
    ? `type ${modelName.pascal}PermissionName = \`can\${keyof typeof ${modelName.camel}AccessControl & string}\`;

`
    : "\n"
}export const ${modelName.camel}Permissions = Object.keys(${modelName.camel}AccessControl).reduce(
  (acc, key) => {
    acc[\`can\${key}\`${isTypeScript ? ` as ${modelName.pascal}PermissionName` : ""}] = authService.permission(
      key,
      "${modelName.kebab}",
      ${modelName.camel}AccessControl
    );
    return acc;
  },
  {} ${isTypeScript ? `as Record<${modelName.pascal}PermissionName, ReturnType<typeof authService.permission>>` : ""}
);`
    : `export const ${modelName.camel}Permissions = {
  canCreate: create${modelName.pascal}Permission("Create"),
  canUpdate: create${modelName.pascal}Permission("Update"),
  canDelete: create${modelName.pascal}Permission("Delete"),
  canView: create${modelName.pascal}Permission("View"),
};`;

  return `${imports}import { authService } from "arkos/services";

export const ${modelName.camel}AccessControl = {
  Create: {
    roles: [],
    name: "Create ${modelNameCapitalized}",
    description: "Permission to create new ${modelNameSpaced} records",
  },
  Update: {
    roles: [],
    name: "Update ${modelNameCapitalized}",
    description: "Permission to update existing ${modelNameSpaced} records",
  },
  Delete: {
    roles: [],
    name: "Delete ${modelNameCapitalized}",
    description: "Permission to delete ${modelNameSpaced} records",
  },
  View: {
    roles: [],
    name: "View ${modelNameCapitalized}",
    description: "Permission to view ${modelNameSpaced} records",
  },
}${typeSatisfies};
${helperFunction}
${permissions}

export const ${modelName.camel}AuthenticationControl = {
  Create: true,
  Update: true,
  Delete: true,
  View: true,
};

const ${modelName.camel}AuthConfigs${isTypeScript ? ": AuthConfigs" : ""} = {
  authenticationControl: ${modelName.camel}AuthenticationControl,
  accessControl: ${modelName.camel}AccessControl,
};

export default ${modelName.camel}AuthConfigs;
`;
}
