import { ModuleComponents } from "../../../utils/dynamic-loader";
import { getUserFileExtension as ext } from "../../../utils/helpers/fs.helpers";
import sheu from "../../../utils/sheu";
import util from "util";

class LoadedComponentsLogger {
  ext = ext();
  componentsToPath: Record<
    keyof ModuleComponents,
    string | ModuleComponents["dtos"]
  > = {
    authConfigs: `{{module-name}}.auth.${this.ext}`,
    prismaQueryOptions: `{{module-name}}.query.${this.ext}`,
    interceptors: `{{module-name}}.interceptors.${this.ext}`,
    interceptorsOld: `{{module-name}}.middlewares.${this.ext}`,
    router: `{{module-name}}.router.${this.ext}`,
    hooks: `{{module-name}}.hooks.${this.ext}`,
    dtos: {
      create: `create-{{module-name}}.dto.${this.ext}`,
      update: `update-{{module-name}}.dto.${this.ext}`,
    },
    schemas: {
      create: `create-{{module-name}}.schema.${this.ext}`,
      update: `update-{{module-name}}.schema.${this.ext}`,
    },
  };

  getComponentsNameList(moduleName: string, components: ModuleComponents) {
    return Object.keys(components).reduce((acc, key) => {
      if (components[key as keyof ModuleComponents]) {
        const mapping = this.componentsToPath[key as keyof ModuleComponents];
        if (!["schemas", "dtos"].includes(key))
          acc.push((mapping as string)!.replace("{{module-name}}", moduleName));
        else {
          if ((components as any)[key as keyof ModuleComponents]?.create)
            acc.push(
              (mapping as ModuleComponents["dtos"])?.create.replace(
                "{{module-name}}",
                moduleName
              )
            );
          if ((components as any)[key as keyof ModuleComponents]?.update)
            acc.push(
              (mapping as ModuleComponents["dtos"])?.update.replace(
                "{{module-name}}",
                moduleName
              )
            );
        }
      }

      return acc;
    }, [] as string[]);
  }

  getLogText(components: ModuleComponents) {
    return `${sheu.bold("AuthConfigs:")} ${components?.authConfigs ? `\n${util.inspect(components.authConfigs, { depth: null, colors: true })}` : " -"}
${sheu.bold("PrismaQueryOptions:")}${components?.prismaQueryOptions ? `\n${util.inspect(components.prismaQueryOptions, { depth: null, colors: true })}` : " -"}
${sheu.bold("Router:")}${components?.router ? `\n${util.inspect(components.router, { depth: null, colors: true })}` : " -"}
${sheu.bold("Interceptors:")}${components?.interceptors ? `\n${util.inspect(components.interceptors, { depth: null, colors: true })}` : " -"}
${sheu.bold("Hooks:")}${components?.hooks ? `\n${util.inspect(components.hooks, { depth: null, colors: true })}` : " -"}
`;
  }
}

const loadedComponentsLogger = new LoadedComponentsLogger();

export default loadedComponentsLogger;
