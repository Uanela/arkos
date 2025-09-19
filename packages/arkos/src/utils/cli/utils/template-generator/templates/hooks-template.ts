// Import helper function to get user's file extension preference
import { getUserFileExtension } from "../../../../helpers/fs.helpers";
// Import template options interface
import { TemplateOptions } from "../../template-generators";

// Main function to generate hooks template based on provided options
export default function generateHooksTemplate(
  options: TemplateOptions
): string {
  // Destructure modelName from options
  const { modelName } = options;
  // Get user's preferred file extension (ts or js)
  const ext = getUserFileExtension();
  // Check if user is using TypeScript
  const isTypeScript = ext === "ts";

  // Throw error if modelName is not provided
  if (!modelName) throw new Error("Model name is required for hooks template");

  // Define base imports for TypeScript - includes all hook argument types
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

  // Define service import path based on file extension
  const serviceImport = `"./${modelName.kebab}.service${ext === "ts" ? "" : "." + "js"}";`;

  // Function to get the appropriate TypeScript type for each hook
  const getHookArgsType = (hookName: string) => {
    // Return empty string for JavaScript
    if (!isTypeScript) return "";

    // Map hook names to their corresponding TypeScript types
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

    // Return the corresponding type for the hook name
    return typeMap[hookName];
  };

  // Function to generate a hook function with proper TypeScript types
  const generateHookFunction = (hookName: string, params: string[]) => {
    // Get the TypeScript type for this hook
    const argsType = getHookArgsType(hookName);
    // Create function parameters with or without TypeScript types
    const args = isTypeScript
      ? `{ ${params.join(", ")} }: ${argsType}`
      : `{ ${params.join(", ")} }`;

    // Return the complete function definition
    return `async function (${args}) {}`;
  };

  // Generate all hook exports with their respective functions
  const hooks = `
// export const beforeFindOne = [
//   ${generateHookFunction("beforeFindOne", ["filters", "queryOptions"])}
// ];

// export const afterFindOne = [
//   ${generateHookFunction("afterFindOne", ["result", "filters", "queryOptions"])}
// ];

// export const onFindOneError = [
//   ${generateHookFunction("onFindOneError", ["error", "filters", "queryOptions"])}
// ];

// export const beforeUpdateOne = [
//   ${generateHookFunction("beforeUpdateOne", ["filters", "data", "queryOptions"])}
// ];

// export const afterUpdateOne = [
//   ${generateHookFunction("afterUpdateOne", ["result", "filters", "data", "queryOptions"])}
// ];

// export const onUpdateOneError = [
//   ${generateHookFunction("onUpdateOneError", ["error", "filters", "data", "queryOptions"])}
// ];

// export const beforeCreateOne = [
//   ${generateHookFunction("beforeCreateOne", ["data", "queryOptions"])}
// ];

// export const afterCreateOne = [
//   ${generateHookFunction("afterCreateOne", ["result", "data", "queryOptions"])}
// ];

// export const onCreateOneError = [
//   ${generateHookFunction("onCreateOneError", ["error", "data", "queryOptions"])}
// ];

// export const beforeCreateMany = [
//   ${generateHookFunction("beforeCreateMany", ["data", "queryOptions"])}
// ];

// export const afterCreateMany = [
//   ${generateHookFunction("afterCreateMany", ["result", "queryOptions"])}
// ];

// export const onCreateManyError = [
//   ${generateHookFunction("onCreateManyError", ["error", "data", "queryOptions"])}
// ];

// export const beforeCount = [
//   ${generateHookFunction("beforeCount", ["filters"])}
// ];

// export const afterCount = [
//   ${generateHookFunction("afterCount", ["result", "filters"])}
// ];

// export const onCountError = [
//   ${generateHookFunction("onCountError", ["error", "filters"])}
// ];

// export const beforeFindMany = [
//   ${generateHookFunction("beforeFindMany", ["filters", "queryOptions"])}
// ];

// export const afterFindMany = [
//   ${generateHookFunction("afterFindMany", ["result", "filters", "queryOptions"])}
// ];

// export const onFindManyError = [
//   ${generateHookFunction("onFindManyError", ["error", "filters", "queryOptions"])}
// ];

// export const beforeUpdateMany = [
//   ${generateHookFunction("beforeUpdateMany", ["filters", "data", "queryOptions"])}
// ];

// export const afterUpdateMany = [
//   ${generateHookFunction("afterUpdateMany", ["result", "filters", "data", "queryOptions"])}
// ];

// export const onUpdateManyError = [
//   ${generateHookFunction("onUpdateManyError", ["error", "filters", "data", "queryOptions"])}
// ];

// export const beforeDeleteOne = [
//   ${generateHookFunction("beforeDeleteOne", ["filters"])}
// ];

// export const afterDeleteOne = [
//   ${generateHookFunction("afterDeleteOne", ["result", "filters"])}
// ];

// export const onDeleteOneError = [
//   ${generateHookFunction("onDeleteOneError", ["error", "filters"])}
// ];

// export const beforeDeleteMany = [
//   ${generateHookFunction("beforeDeleteMany", ["filters"])}
// ];

// export const afterDeleteMany = [
//   ${generateHookFunction("afterDeleteMany", ["result", "filters"])}
// ];

// export const onDeleteManyError = [
//   ${generateHookFunction("onDeleteManyError", ["error", "filters"])}
// ];
`;

  // Return the complete template with imports, exports, and hook functions
  return `${baseImports}
// import { Prisma } from "@prisma/client"
// import ${modelName.camel}Service from ${serviceImport}

${hooks}`;
}
