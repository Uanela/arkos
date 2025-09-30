import { Command } from "commander";
import { buildCommand } from "./build";
import { devCommand } from "./dev";
import { startCommand } from "./start";
import { generateCommand } from "./generate";
import { getVersion } from "./utils/cli.helpers";
import prismaGenerateCommand from "./prisma-generate";

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
  .description("Generate arkos components");

generate
  .command("controller")
  .alias("c")
  .description("Generate a new controller")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for the controller",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.controller);

generate
  .command("service")
  .alias("s")
  .description("Generate a new service")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for the service",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.service);

generate
  .command("router")
  .alias("r")
  .description("Generate a new router")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for the router",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.router);

generate
  .command("auth-configs")
  .alias("a")
  .description("Generate auth configuration")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for the router",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.authConfigs);

generate
  .command("query-options")
  .alias("q")
  .description("Generate prisma query options")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for query options",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.queryOptions);

generate
  .command("middlewares")
  .alias("m")
  .description("Generate a new interceptors file")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for middleware",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.interceptors);

generate
  .command("interceptors")
  .alias("i")
  .description("Generate a new interceptors file")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for interceptors",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.interceptors);

generate
  .command("hooks")
  .alias("h")
  .description("Generate a new service hooks file")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for hooks",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.hooks);

generate
  .command("create-schema")
  .alias("cs")
  .description("Generate a new zod create schema file for a prisma model")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for hooks",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.createSchema);

generate
  .command("update-schema")
  .alias("us")
  .description("Generate a new zod update schema file for a prisma model")
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for hooks",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.updateSchema);

generate
  .command("create-dto")
  .alias("cd")
  .description(
    "Generate a new class-validator create dto file for a prisma model"
  )
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for hooks",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.createDto);

generate
  .command("update-dto")
  .alias("ud")
  .description(
    "Generate a new class-validator update dto file for a prisma model"
  )
  .requiredOption("-m, --model <name>, --module <name>", "Module name")
  .option(
    "-p, --path <path>",
    "Custom path for hooks",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.updateDto);

program
  .command("prisma")
  .command("generate")
  .description("Generate your @prisma/client and BaseService class types")
  .action(prismaGenerateCommand);

program.parse(process.argv);

export { program, buildCommand, devCommand, startCommand, generateCommand };
