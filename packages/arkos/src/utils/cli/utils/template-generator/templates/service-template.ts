import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateServiceTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Module name is required for service template");

  let serviceType = ["auth", "fileUpload", "email"].includes(modelName.camel)
    ? modelName.camel
    : "base";
  let serviceName: string =
    (serviceType !== "base" ? `Arkos${modelName.pascal}` : "Base") + "Service";
  let serviceImport: string =
    imports?.[`${serviceType}Service`] || "arkos/services";

  const serviceClassImport = `import { ${serviceName.startsWith("Arkos") ? `${serviceName.replace("Arkos", "")} as ${serviceName}` : serviceName} } from "${serviceImport}";`;

  const typeParameter =
    isTypeScript && serviceType === "base" ? `<"${modelName.kebab}">` : "";

  const constructorParam = (() => {
    if (serviceType === "base") return `"${modelName.kebab}"`;
    else if (serviceType === "file-upload")
      return `"/uploads", 10 * 1024 * 1024, /.*/, 10`;
    else return "";
  })();

  return `${serviceClassImport}
  
class ${modelName.pascal}Service extends ${serviceName}${typeParameter} {}

const ${modelName.camel}Service = new ${modelName.pascal}Service(${constructorParam});

export default ${modelName.camel}Service;
`;
}
