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
  .description("Generate arkos components");

generate
  .command("controller")
  .alias("c")
  .description("Generate a new controller")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
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
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
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
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
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
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option("-a, --advanced", "Advanced code structure")
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
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for query options",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.queryOptions);

generate
  .command("interceptors")
  .alias("i")
  .description("Generate a new interceptors file")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
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

  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
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
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for schema",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.createSchema);

generate
  .command("update-schema")
  .alias("us")
  .description("Generate a new zod update schema file for a prisma model")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for schema",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.updateSchema);

generate
  .command("schema")
  .alias("sc")
  .description("Generate a new zod create schema file for a prisma model")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for schema",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.baseSchema);

generate
  .command("query-schema")
  .alias("qs")
  .description("Generate a new zod update schema file for a prisma model")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for schema",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.querySchema);

generate
  .command("create-dto")
  .alias("cd")
  .description(
    "Generate a new class-validator create dto file for a prisma model"
  )
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for dto",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.createDto);

generate
  .command("update-dto")
  .alias("ud")
  .description(
    "Generate a new class-validator update dto file for a prisma model"
  )
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for dto",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.updateDto);

generate
  .command("dto")
  .alias("d")
  .description(
    "Generate a new class-validator base dto file for a prisma model"
  )
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for dto",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.baseDto);

generate
  .command("query-dto")
  .alias("qd")
  .description(
    "Generate a new class-validator base dto file for a prisma model"
  )
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option(
    "-p, --path <path>",
    "Custom path for dto",
    "src/modules/{{module-name}}"
  )
  .action(generateCommand.queryDto);

generate
  .command("model")
  .alias("m")
  .description("Generate a new prisma model")
  .option("-m, --module <name>", "Module name")
  .option("--model <name>", "Module name (alias for --module)")
  .option("-p, --path <path>", "Custom path for prisma model", "prisma/schema")
  .action(generateCommand.prismaModel);

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
