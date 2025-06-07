// src/utils/cli/index.ts
import { Command } from "commander";
import { buildCommand } from "./build";
import path from "path";
import fs from "fs";
import { devCommand } from "./dev";
import { startCommand } from "./start";
import { generateCommand } from "./generate";

export function getVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../../../package.json"), "utf8")
  );

  return packageJson.version || "1.0.0";
}

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

// Generate command with alias 'g'
const generate = program
  .command("generate")
  .alias("g")
  .description("Generate arkos components");

generate
  .command("controller")
  .alias("c")
  .description("Generate a new controller")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for the controller", "src/modules")
  .action(generateCommand.controller);

generate
  .command("service")
  .alias("s")
  .description("Generate a new service")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for the service", "src/modules")
  .action(generateCommand.service);

generate
  .command("router")
  .alias("r")
  .description("Generate a new router")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for the router", "src/modules")
  .action(generateCommand.router);

generate
  .command("auth-configs")
  .alias("a")
  .description("Generate auth configuration")
  .option("--path <path>", "Custom path for auth config", "src/modules")
  .action(generateCommand.authConfigs);

generate
  .command("query-options")
  .alias("q")
  .description("Generate prisma query options")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for query options", "src/modules")
  .action(generateCommand.queryOptions);

generate
  .command("middlewares")
  .alias("m")
  .description("Generate a new middleware file")
  .requiredOption("-m, --model <name>", "Middleware name")
  .option("-p, --path <path>", "Custom path for middleware", "src/modules")
  .action(generateCommand.middlewares);

program.parse(process.argv);

export { program, buildCommand, devCommand, startCommand, generateCommand };
