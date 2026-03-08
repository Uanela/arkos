import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { kebabPrismaModels } from "../../../generate";
import { TemplateOptions } from "../../template-generators";

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
      ? `: RouterConfig<${["file-upload", "auth"].includes(modelName.kebab) ? modelName.kebab : '"prisma"'}>`
      : "";
  const routerConfigTsTypeImport =
    ext === "ts" ? "import { RouterConfig } from 'arkos'" : "";
  const routeConfig = isNormalModule
    ? `
export const config${routerConfigTsType} = { }
`
    : "";

  return `import { ArkosRouter } from 'arkos'
${routerConfigTsTypeImport}
${routeConfig}

const ${modelName.camel}Router = ArkosRouter()

export default ${modelName.camel}Router
`;
}
