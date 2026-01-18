import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export default function generateHooksTemplate(
  options: TemplateOptions
): string {
  const { modelName } = options;
  const ext = getUserFileExtension();

  if (!modelName) throw new Error("Module name is required for hooks template");

  const serviceImport = `"./${modelName.kebab}.service${ext === "ts" ? "" : "." + "js"}";`;

  const hooks = `export const beforeFindOne = [];

export const afterFindOne = [];

export const onFindOneError = [];

export const beforeUpdateOne = [];

export const afterUpdateOne = [];

export const onUpdateOneError = [];

export const beforeCreateOne = [];

export const afterCreateOne = [];

export const onCreateOneError = [];

export const beforeCreateMany = [];

export const afterCreateMany = [];

export const onCreateManyError = [];

export const beforeCount = [];

export const afterCount = [];

export const onCountError = [];

export const beforeFindMany = [];

export const afterFindMany = [];

export const onFindManyError = [];

export const beforeUpdateMany = [];

export const afterUpdateMany = [];

export const onUpdateManyError = [];

export const beforeDeleteOne = [];

export const afterDeleteOne = [];

export const onDeleteOneError = [];

export const beforeDeleteMany = [];

export const afterDeleteMany = [];

export const onDeleteManyError = [];
`;

  return `import ${modelName.camel}Service from ${serviceImport}

${hooks}`;
}
