import { Command } from "commander";
import { buildCommand } from "./build";
import { devCommand } from "./dev";
import { startCommand } from "./start";
import { generateCommand } from "./generate";
import { getVersion } from "./utils/cli.helpers";
import prismaGenerateCommand from "./prisma-generate";
import exportAuthActionCommand from "./export-auth-action";

const program = new Command();

program.name("arkos").description("Arkos.js CLI").version(getVersion());

program
  .command("build")
  .description("Build your Arkos project")
  .option("-m, --module <type>", "Module type (cjs or esm)", "cjs")
  .action(buildCommand);

program
  .command("dev")
  .description("Run development server")
  .option("-p, --port <number>", "Port number")
  .option("-h, --host <host>", "Host to bind to")
  .action(devCommand);

program
  .command("start")
  .description("Run production server")
  .option("-p, --port <number>", "Port number")
  .option("-h, --host <host>", "Host to bind to")
  .action(startCommand);

const generate = program
  .command("generate")
  .alias("g")
  .description("Generate arkos components")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for the component",
    "src/modules/{{module-name}}"
  )
  .option("-o, --overwrite", "Overwrites all the content on the existing file");

generate
  .command("controller")
  .alias("c")
  .description("Generate a new controller")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.controller({ ...generateOptions, ...options });
  });

generate
  .command("service")
  .alias("s")
  .description("Generate a new service")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.service({ ...generateOptions, ...options });
  });

generate
  .command("router")
  .alias("r")
  .description("Generate a new router")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.router({ ...generateOptions, ...options });
  });

generate
  .command("auth-configs")
  .alias("a")
  .description("Generate auth configuration")
  .option("-a, --advanced", "Advanced code structure")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.authConfigs({ ...generateOptions, ...options });
  });

generate
  .command("query-options")
  .alias("q")
  .description("Generate prisma query options")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.queryOptions({ ...generateOptions, ...options });
  });

generate
  .command("interceptors")
  .alias("i")
  .description("Generate a new interceptors file")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.interceptors({ ...generateOptions, ...options });
  });

generate
  .command("hooks")
  .alias("h")
  .description("Generate a new service hooks file")

  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.hooks({ ...generateOptions, ...options });
  });

generate
  .command("create-schema")
  .alias("cs")
  .description("Generate a new zod create schema file for a prisma model")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.createSchema({ ...generateOptions, ...options });
  });

generate
  .command("update-schema")
  .alias("us")
  .description("Generate a new zod update schema file for a prisma model")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.updateSchema({ ...generateOptions, ...options });
  });

generate
  .command("schema")
  .alias("sc")
  .description("Generate a new zod create schema file for a prisma model")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.baseSchema({ ...generateOptions, ...options });
  });

generate
  .command("query-schema")
  .alias("qs")
  .description("Generate a new zod update schema file for a prisma model")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.querySchema({ ...generateOptions, ...options });
  });

generate
  .command("create-dto")
  .alias("cd")
  .description(
    "Generate a new class-validator create dto file for a prisma model"
  )
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.createDto({ ...generateOptions, ...options });
  });

generate
  .command("update-dto")
  .alias("ud")
  .description(
    "Generate a new class-validator update dto file for a prisma model"
  )
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.updateDto({ ...generateOptions, ...options });
  });

generate
  .command("dto")
  .alias("d")
  .description(
    "Generate a new class-validator base dto file for a prisma model"
  )
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.baseDto({ ...generateOptions, ...options });
  });

generate
  .command("query-dto")
  .alias("qd")
  .description(
    "Generate a new class-validator base dto file for a prisma model"
  )
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.queryDto({ ...generateOptions, ...options });
  });

generate
  .command("model")
  .alias("m")
  .description("Generate a new prisma model")
  .option("-p, --path <path>", "Custom path for prisma model", "prisma/schema")
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.prismaModel({ ...generateOptions, ...options });
  });

generate
  .command("components")
  .alias("co")
  .description("Generate multiple components for a module")
  .option("-a, --all", "Generate all components")
  .option(
    "-n, --names <names>",
    "Comma-separated list of components (e.g., s,sc,m or service,schema,model)"
  )
  .action((options) => {
    const generateOptions = generate.opts();
    generateCommand.multipleComponents({ ...generateOptions, ...options });
  });

program
  .command("prisma")
  .command("generate")
  .description("Generate your @prisma/client and BaseService class types")
  .action(prismaGenerateCommand);

program
  .command("export")
  .command("auth-action")
  .description("Export file with an array containing all auth-actions")
  .option("-o, --overwrite", "Overwrites all the changes on the object")
  .option(
    "-p, --path <path>",
    "Custom path for auth-actions",
    "src/modules/auth/utils"
  )
  .action(exportAuthActionCommand);

program.parse(process.argv);

export { program, buildCommand, devCommand, startCommand, generateCommand };
