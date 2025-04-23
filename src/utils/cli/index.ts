// src/utils/cli/index.ts
import { Command } from "commander";
import { buildCommand } from "./build";
import path from "path";
import fs from "fs";
import { devCommand } from "./dev";
import { startCommand } from "./start";

export function getVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../../../package.json"), "utf8")
  );

  return packageJson.version || "1.0.0";
}

const program = new Command();

program.name("arkos").description("Arkos framework CLI").version(getVersion());

program
  .command("build")
  .description("Build your Arkos project")
  .option("-w, --watch", "Watch for changes")
  .option("-c, --config <path>", "Path to config file")
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

program.parse(process.argv);

export { program, buildCommand, devCommand, startCommand };
