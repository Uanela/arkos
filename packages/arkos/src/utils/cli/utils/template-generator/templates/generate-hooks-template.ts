import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export default function generateHooksTemplate(
  options: TemplateOptions
): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName) throw new Error("Model name is required for hooks template");

  const baseImports = isTypeScript
    ? `import { 
  BeforeFindOneHookArgs, 
  AfterFindOneHookArgs, 
  BeforeUpdateOneHookArgs, 
  AfterUpdateOneHookArgs,
  BeforeCreateOneHookArgs,
  AfterCreateOneHookArgs,
  BeforeCreateManyHookArgs,
  AfterCreateManyHookArgs,
  BeforeCountHookArgs,
  AfterCountHookArgs,
  BeforeFindManyHookArgs,
  AfterFindManyHookArgs,
  BeforeUpdateManyHookArgs,
  AfterUpdateManyHookArgs,
  BeforeDeleteOneHookArgs,
  AfterDeleteOneHookArgs,
  BeforeDeleteManyHookArgs,
  AfterDeleteManyHookArgs
} from "arkos/services";`
    : ``;

  const prismaImport = `"../../utils/prisma${ext === "ts" ? "" : "." + "js"}";`;

  const serviceImport = `"./${modelName.kebab}.service${ext === "ts" ? "" : "." + "js"}";`;

  const delegateExport = isTypeScript
    ? `\nexport type ${modelName.pascal}Delegate = typeof prisma.${modelName.camel};`
    : "";

  const getHookArgsType = (hookName: string) => {
    if (!isTypeScript) return "";

    const typeMap: Record<string, string> = {
      beforeFindOne: `BeforeFindOneHookArgs<${modelName.pascal}Delegate>`,
      afterFindOne: `AfterFindOneHookArgs<${modelName.pascal}Delegate>`,
      beforeUpdateOne: `BeforeUpdateOneHookArgs<${modelName.pascal}Delegate>`,
      afterUpdateOne: `AfterUpdateOneHookArgs<${modelName.pascal}Delegate>`,
      beforeCreateOne: `BeforeCreateOneHookArgs<${modelName.pascal}Delegate>`,
      afterCreateOne: `AfterCreateOneHookArgs<${modelName.pascal}Delegate>`,
      beforeCreateMany: `BeforeCreateManyHookArgs<${modelName.pascal}Delegate>`,
      afterCreateMany: `AfterCreateManyHookArgs<${modelName.pascal}Delegate>`,
      beforeCount: `BeforeCountHookArgs<${modelName.pascal}Delegate>`,
      afterCount: `AfterCountHookArgs<${modelName.pascal}Delegate>`,
      beforeFindMany: `BeforeFindManyHookArgs<${modelName.pascal}Delegate>`,
      afterFindMany: `AfterFindManyHookArgs<${modelName.pascal}Delegate>`,
      beforeUpdateMany: `BeforeUpdateManyHookArgs<${modelName.pascal}Delegate>`,
      afterUpdateMany: `AfterUpdateManyHookArgs<${modelName.pascal}Delegate>`,
      beforeDeleteOne: `BeforeDeleteOneHookArgs<${modelName.pascal}Delegate>`,
      afterDeleteOne: `AfterDeleteOneHookArgs<${modelName.pascal}Delegate>`,
      beforeDeleteMany: `BeforeDeleteManyHookArgs<${modelName.pascal}Delegate>`,
      afterDeleteMany: `AfterDeleteManyHookArgs<${modelName.pascal}Delegate>`,
    };

    return typeMap[hookName];
  };

  const generateHookFunction = (hookName: string, params: string[]) => {
    const argsType = getHookArgsType(hookName);
    const args = isTypeScript
      ? `{ ${params.join(", ")} }: ${argsType}`
      : `{ ${params.join(", ")} }`;

    return `async function ${hookName}(${args}) {}`;
  };

  const hooks = `
export const beforeFindOne = [
  ${generateHookFunction("beforeFindOne", ["context", "filters", "queryOptions"])}
];

export const afterFindOne = [
  ${generateHookFunction("afterFindOne", ["context", "result", "filters", "queryOptions"])}
];

export const beforeUpdateOne = [
  ${generateHookFunction("beforeUpdateOne", ["context", "filters", "data", "queryOptions"])}
];

export const afterUpdateOne = [
  ${generateHookFunction("afterUpdateOne", ["context", "result", "filters", "data", "queryOptions"])}
];

export const beforeCreateOne = [
  ${generateHookFunction("beforeCreateOne", ["context", "data", "queryOptions"])}
];

export const afterCreateOne = [
  ${generateHookFunction("afterCreateOne", ["context", "result", "data", "queryOptions"])}
];

export const beforeCreateMany = [
  ${generateHookFunction("beforeCreateMany", ["context", "data", "queryOptions"])}
];

export const afterCreateMany = [
  ${generateHookFunction("afterCreateMany", ["context", "result", "queryOptions"])}
];

export const beforeCount = [
  ${generateHookFunction("beforeCount", ["context", "filters"])}
];

export const afterCount = [
  ${generateHookFunction("afterCount", ["context", "result", "filters"])}
];

export const beforeFindMany = [
  ${generateHookFunction("beforeFindMany", ["context", "filters", "queryOptions"])}
];

export const afterFindMany = [
  ${generateHookFunction("afterFindMany", ["context", "result", "filters", "queryOptions"])}
];

export const beforeUpdateMany = [
  ${generateHookFunction("beforeUpdateMany", ["context", "filters", "data", "queryOptions"])}
];

export const afterUpdateMany = [
  ${generateHookFunction("afterUpdateMany", ["context", "result", "filters", "data", "queryOptions"])}
];

export const beforeDeleteOne = [
  ${generateHookFunction("beforeDeleteOne", ["context", "filters"])}
];

export const afterDeleteOne = [
  ${generateHookFunction("afterDeleteOne", ["context", "result", "filters"])}
];

export const beforeDeleteMany = [
  ${generateHookFunction("beforeDeleteMany", ["context", "filters"])}
];

export const afterDeleteMany = [
  ${generateHookFunction("afterDeleteMany", ["context", "result", "filters"])}
];
`;

  return `${baseImports}
import prisma from ${prismaImport}
import ${modelName.camel}Service from ${serviceImport}
${delegateExport}

${hooks}`;
}
