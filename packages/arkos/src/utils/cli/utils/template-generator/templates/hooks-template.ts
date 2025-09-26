import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

// Main function to generate hooks template based on provided options
export default function generateHooksTemplate(
  options: TemplateOptions
): string {
  const { modelName } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName) throw new Error("Module name is required for hooks template");

  const baseImports = isTypeScript
    ? `// import { 
// BeforeFindOneHookArgs, 
// AfterFindOneHookArgs, 
// BeforeUpdateOneHookArgs, 
// AfterUpdateOneHookArgs,
// BeforeCreateOneHookArgs,
// AfterCreateOneHookArgs,
// BeforeCreateManyHookArgs,
// AfterCreateManyHookArgs,
// BeforeCountHookArgs,
// AfterCountHookArgs,
// BeforeFindManyHookArgs,
// AfterFindManyHookArgs,
// BeforeUpdateManyHookArgs,
// AfterUpdateManyHookArgs,
// BeforeDeleteOneHookArgs,
// AfterDeleteOneHookArgs,
// BeforeDeleteManyHookArgs,
// AfterDeleteManyHookArgs,
// OnCreateOneErrorHookArgs,
// OnCreateManyErrorHookArgs,
// OnCountErrorHookArgs,
// OnFindManyErrorHookArgs,
// OnFindByIdErrorHookArgs,
// OnFindOneErrorHookArgs,
// OnUpdateOneErrorHookArgs,
// OnUpdateManyErrorHookArgs,
// OnDeleteOneErrorHookArgs,
// OnDeleteManyErrorHookArgs
// } from "arkos/services";`
    : ``;

  const serviceImport = `"./${modelName.kebab}.service${ext === "ts" ? "" : "." + "js"}";`;

  const getHookArgsType = (hookName: string) => {
    if (!isTypeScript) return "";

    const typeMap: Record<string, string> = {
      beforeFindOne: `BeforeFindOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterFindOne: `AfterFindOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeUpdateOne: `BeforeUpdateOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterUpdateOne: `AfterUpdateOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeCreateOne: `BeforeCreateOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterCreateOne: `AfterCreateOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeCreateMany: `BeforeCreateManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterCreateMany: `AfterCreateManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeCount: `BeforeCountHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterCount: `AfterCountHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeFindMany: `BeforeFindManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterFindMany: `AfterFindManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeUpdateMany: `BeforeUpdateManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterUpdateMany: `AfterUpdateManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeDeleteOne: `BeforeDeleteOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterDeleteOne: `AfterDeleteOneHookArgs<Prisma.${modelName.pascal}Delegate>`,
      beforeDeleteMany: `BeforeDeleteManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      afterDeleteMany: `AfterDeleteManyHookArgs<Prisma.${modelName.pascal}Delegate>`,
      // Error hook types
      onCreateOneError: `OnCreateOneErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onCreateManyError: `OnCreateManyErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onCountError: `OnCountErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onFindManyError: `OnFindManyErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onFindByIdError: `OnFindByIdErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onFindOneError: `OnFindOneErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onUpdateOneError: `OnUpdateOneErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onUpdateManyError: `OnUpdateManyErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onDeleteOneError: `OnDeleteOneErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
      onDeleteManyError: `OnDeleteManyErrorHookArgs<Prisma.${modelName.pascal}Delegate>`,
    };

    return typeMap[hookName];
  };

  const generateHookFunction = (hookName: string, params: string[]) => {
    const argsType = getHookArgsType(hookName);
    const args = isTypeScript
      ? `{ ${params.join(", ")} }: ${argsType}`
      : `{ ${params.join(", ")} }`;
    return `async (${args}) => {}`;
  };

  const hooks = `
// export const beforeFindOne = [
//   ${generateHookFunction("beforeFindOne", ["context", "filters", "queryOptions"])}
// ];

// export const afterFindOne = [
//   ${generateHookFunction("afterFindOne", ["context", "result", "filters", "queryOptions"])}
// ];

// export const onFindOneError = [
//   ${generateHookFunction("onFindOneError", ["context", "error", "filters", "queryOptions"])}
// ];

// export const beforeUpdateOne = [
//   ${generateHookFunction("beforeUpdateOne", ["context", "filters", "data", "queryOptions"])}
// ];

// export const afterUpdateOne = [
//   ${generateHookFunction("afterUpdateOne", ["context", "result", "filters", "data", "queryOptions"])}
// ];

// export const onUpdateOneError = [
//   ${generateHookFunction("onUpdateOneError", ["context", "error", "filters", "data", "queryOptions"])}
// ];

// export const beforeCreateOne = [
//   ${generateHookFunction("beforeCreateOne", ["context", "data", "queryOptions"])}
// ];

// export const afterCreateOne = [
//   ${generateHookFunction("afterCreateOne", ["context", "result", "data", "queryOptions"])}
// ];

// export const onCreateOneError = [
//   ${generateHookFunction("onCreateOneError", ["context", "error", "data", "queryOptions"])}
// ];

// export const beforeCreateMany = [
//   ${generateHookFunction("beforeCreateMany", ["context", "data", "queryOptions"])}
// ];

// export const afterCreateMany = [
//   ${generateHookFunction("afterCreateMany", ["context", "result", "queryOptions"])}
// ];

// export const onCreateManyError = [
//   ${generateHookFunction("onCreateManyError", ["context", "error", "data", "queryOptions"])}
// ];

// export const beforeCount = [
//   ${generateHookFunction("beforeCount", ["context", "filters"])}
// ];

// export const afterCount = [
//   ${generateHookFunction("afterCount", ["context", "result", "filters"])}
// ];

// export const onCountError = [
//   ${generateHookFunction("onCountError", ["context", "error", "filters"])}
// ];

// export const beforeFindMany = [
//   ${generateHookFunction("beforeFindMany", ["context", "filters", "queryOptions"])}
// ];

// export const afterFindMany = [
//   ${generateHookFunction("afterFindMany", ["context", "result", "filters", "queryOptions"])}
// ];

// export const onFindManyError = [
//   ${generateHookFunction("onFindManyError", ["context", "error", "filters", "queryOptions"])}
// ];

// export const beforeUpdateMany = [
//   ${generateHookFunction("beforeUpdateMany", ["context", "filters", "data", "queryOptions"])}
// ];

// export const afterUpdateMany = [
//   ${generateHookFunction("afterUpdateMany", ["context", "result", "filters", "data", "queryOptions"])}
// ];

// export const onUpdateManyError = [
//   ${generateHookFunction("onUpdateManyError", ["context", "error", "filters", "data", "queryOptions"])}
// ];

// export const beforeDeleteOne = [
//   ${generateHookFunction("beforeDeleteOne", ["context", "filters"])}
// ];

// export const afterDeleteOne = [
//   ${generateHookFunction("afterDeleteOne", ["context", "result", "filters"])}
// ];

// export const onDeleteOneError = [
//   ${generateHookFunction("onDeleteOneError", ["context", "error", "filters"])}
// ];

// export const beforeDeleteMany = [
//   ${generateHookFunction("beforeDeleteMany", ["context", "filters"])}
// ];

// export const afterDeleteMany = [
//   ${generateHookFunction("afterDeleteMany", ["context", "result", "filters"])}
// ];

// export const onDeleteManyError = [
//   ${generateHookFunction("onDeleteManyError", ["context", "error", "filters"])}
// ];
`;

  return `${baseImports}
// import { Prisma } from "@prisma/client"
// import ${modelName.camel}Service from ${serviceImport}

${hooks}`;
}
