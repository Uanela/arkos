// // src/utils/cli/index.ts
// import { Command } from "commander";
// import { buildCommand } from "./build";
// import path from "path";
// import fs from "fs";
// import { devCommand } from "./dev";
// import { startCommand } from "./start";

// export function getVersion() {
//   const packageJson = JSON.parse(
//     fs.readFileSync(path.join(__dirname, "../../../../package.json"), "utf8")
//   );

//   return packageJson.version || "1.0.0";
// }

// const program = new Command();

// program.name("arkos").description("Arkos.js CLI").version(getVersion());

// program
//   .command("build")
//   .description("Build your Arkos project")
//   .option("-m, --module <type>", "Module type (cjs or esm)", "cjs")
//   .action(buildCommand);

// program
//   .command("dev")
//   .description("Run development server")
//   .option("-p, --port <number>", "Port number")
//   .option("-h, --host <host>", "Host to bind to")
//   .action(devCommand);

// program
//   .command("start")
//   .description("Run production server")
//   .option("-p, --port <number>", "Port number")
//   .option("-h, --host <host>", "Host to bind to")
//   .action(startCommand);

// program.parse(process.argv);

// export { program, buildCommand, devCommand, startCommand };

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

// New add command with subcommands
const generate = program
  .command("generate")
  .description("Generate arkos components");

generate
  .command("controller")
  .description("Generate a new controller")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for the controller", "src/modules")
  .action(generateCommand.controller);

generate
  .command("service")
  .description("Generate a new service")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for the service", "src/modules")
  .action(generateCommand.service);

generate
  .command("router")
  .description("Generate a new router")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for the router", "src/modules")
  .action(generateCommand.router);

generate
  .command("auth-configs")
  .description("Generate auth configuration")
  .option("--path <path>", "Custom path for auth config", "src/modules")
  .action(generateCommand.authConfig);

generate
  .command("query-options")
  .description("Generate prisma query options")
  .requiredOption("-m, --model <name>", "Model name")
  .option("-p, --path <path>", "Custom path for query options", "src/modules")
  .action(generateCommand.queryOptions);

generate
  .command("middlewares")
  .description("Generate a new middleware file")
  .requiredOption("-m, --model <name>", "Middleware name")
  .option("-p, --path <path>", "Custom path for middleware", "src/modules")
  .action(generateCommand.middleware);

program.parse(process.argv);

export { program, buildCommand, devCommand, startCommand, generateCommand };
