import { TemplateOptions } from "../../template-generators";

export function generateRouteHookTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  const isAuthModule = modelName.kebab === "auth";
  const isFileUploadModule =
    modelName.kebab === "file-upload" || modelName.kebab === "fileUpload";

  const moduleType = isAuthModule
    ? `"auth"`
    : isFileUploadModule
      ? `"file-upload"`
      : `"${modelName.kebab}"`;

  const methods = isAuthModule
    ? ["getMe", "login", "logout", "signup", "updateMe", "updatePassword"]
    : isFileUploadModule
      ? ["findFile", "uploadFile", "updateFile", "deleteFile"]
      : [
          "createOne",
          "findOne",
          "findMany",
          "updateOne",
          "deleteOne",
          "createMany",
          "updateMany",
          "deleteMany",
        ];

  const methodCalls = methods
    .map((m) => `${modelName.camel}RouteHook.${m}({});`)
    .join("\n\n");

  return `import { ArkosRouteHook } from 'arkos';

const ${modelName.camel}RouteHook = ArkosRouteHook(${moduleType});

${methodCalls}

export default ${modelName.camel}RouteHook;
`;
}
