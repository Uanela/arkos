import { getArkosConfig } from "../../../../helpers/arkos-config.helpers";
import { kebabCase } from "../../../../helpers/change-case.helpers";
import prismaSchemaParser from "../../../../prisma/prisma-schema-parser";
import { TemplateOptions } from "../../template-generators";

export function generatePolicyTemplate(options: TemplateOptions): string {
  const { modelName } = options;
  const arkosConfig = getArkosConfig();

  if (!modelName)
    throw new Error("Module name is required for policy template");

  const modelNameCapitalized = modelName.kebab
    .replaceAll("-", " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const modelNameSpaced = modelName.kebab.replaceAll("-", " ");

  const models = prismaSchemaParser
    .getModelsAsArrayOfStrings()
    .map((m) => kebabCase(m.toLowerCase()));

  const isPrismaModel = models.includes(modelName.kebab.toLowerCase());

  const crudRules = isPrismaModel
    ? `
  .rule("Create", {
    ${arkosConfig?.authentication?.mode === "static" ? "roles: [],\n" : ""}name: "Create ${modelNameCapitalized}",
    description: "Permission to create new ${modelNameSpaced} records",
  })
  .rule("View", {
    ${arkosConfig?.authentication?.mode === "static" ? "roles: [],\n" : ""}name: "View ${modelNameCapitalized}",
    description: "Permission to view ${modelNameSpaced} records",
  })
  .rule("Update", {
    ${arkosConfig?.authentication?.mode === "static" ? "roles: [],\n" : ""}name: "Update ${modelNameCapitalized}",
    description: "Permission to update existing ${modelNameSpaced} records",
  })
  .rule("Delete", {
    ${arkosConfig?.authentication?.mode === "static" ? "roles: [],\n" : ""}name: "Delete ${modelNameCapitalized}",
    description: "Permission to delete ${modelNameSpaced} records",
  })`
    : "";

  return `import { ArkosPolicy } from "arkos";

const ${modelName.camel}Policy = ArkosPolicy("${modelName.kebab}")${crudRules};

export default ${modelName.camel}Policy;
`;
}
