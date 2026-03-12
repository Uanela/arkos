import { TemplateOptions } from "../../template-generators";

export function generateServiceHookTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  const methods = [
    "createOne",
    "createMany",
    "count",
    "findMany",
    "findOne",
    "findById",
    "updateOne",
    "updateById",
    "updateMany",
    "deleteOne",
    "deleteById",
    "deleteMany",
  ];

  const methodCalls = methods
    .map((m) => `${modelName.camel}ServiceHook.${m}({});`)
    .join("\n\n");

  return `import { ArkosServiceHook } from 'arkos';

const ${modelName.camel}ServiceHook = ArkosServiceHook("${modelName.kebab}");

${methodCalls}

export default ${modelName.camel}ServiceHook;
`;
}
