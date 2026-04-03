import pluralize, { singular } from "pluralize";
import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { kebabPrismaModels } from "../../../generate";
import { TemplateOptions } from "../../template-generators";
import { pascalCase } from "../../../../helpers/change-case.helpers";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for router template");

  const isNormalModule = [...kebabPrismaModels, "file-upload", "auth"].includes(
    modelName.kebab
  );
  const ext = getUserFileExtension();

  const routerConfigTsType =
    ext === "ts"
      ? `: RouteHook<${["file-upload", "auth"].includes(modelName.kebab) ? `"${modelName.kebab}"` : '"prisma"'}>`
      : "";
  const routerConfigTsTypeImport =
    ext === "ts" ? "import { RouteHook } from 'arkos'" : "";
  const routeConfig = isNormalModule
    ? `
export const hook${routerConfigTsType} = { }
`
    : "";

  return `import { ArkosRouter } from 'arkos';${modelName.kebab === "file-upload" ? "\nimport config from '@/arkos.config'" : ""}
${routerConfigTsTypeImport}
${routeConfig}

const ${modelName.camel}Router = ArkosRouter({ 
  openapi: { tags: ["${singular(pascalCase(modelName.kebab.replaceAll("-", " ")))}"] }
})

export default ${modelName.camel}Router
`;
}
