import { authActionService } from "../../../exports/services";
import fs from "fs/promises";
import path from "path";
import sheu from "../../sheu";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { importModule } from "../../helpers/global.helpers";
import deepmerge from "../../helpers/deepmerge.helper";
import { killDevelopmentServerChildProcess } from "../dev";

/**
 * Runtime CLI Commander class for handling command-line interface commands
 * during runtime execution. Provides methods for executing various CLI commands
 * and managing their lifecycle.
 *
 * @class RuntimeCliCommander
 */
class RuntimeCliCommander {
  /**
   * Parses and returns CLI command options from environment variables
   *
   * @returns {Object} Parsed CLI command options object
   *
   * @example
   * // Returns { overwrite: true, path: './exports' }
   * getOptions();
   */
  getOptions(): { overwrite?: boolean; path: string } {
    return JSON.parse(process.env.CLI_COMMAND_OPTIONS || "{}");
  }

  /**
   * Terminates the development server child process and exits the current process
   *
   * @returns {void}
   */
  end(): void {
    killDevelopmentServerChildProcess();
    process.exit(1);
  }

  /**
   * Main command handler that routes to specific command implementations
   * based on the CLI_COMMAND environment variable
   *
   * @returns {Promise<void>}
   *
   * @example
   * // Handles EXPORT_AUTH_ACTION command
   * await handle();
   */
  async handle(): Promise<void> {
    const command = process.env.CLI_COMMAND;
    if (command === "EXPORT_AUTH_ACTION") await this.exportAuthAction();
  }

  /**
   * Exports authentication actions to a file, with options for merging with existing
   * actions and specifying output path
   *
   * @param {Object} [options] - Export configuration options
   * @param {boolean} [options.overwrite] - Whether to overwrite existing file (default: false)
   * @param {string} [options.path] - Custom output directory path
   * @returns {Promise<void>}
   *
   * @example
   * // Export with default options (merge if exists)
   * await exportAuthAction();
   *
   * @example
   * // Export with overwrite and custom path
   * await exportAuthAction({ overwrite: true, path: './custom-exports' });
   */
  async exportAuthAction(): Promise<void> {
    const options = this.getOptions() as { overwrite?: boolean; path?: string };
    const authActions = authActionService.getAll();

    const targetPath = path.join(
      process.cwd(),
      options.path || "",
      `auth-actions.${getUserFileExtension()}`
    );

    let finalAuthActions = authActions;
    let isUpdate = false;

    if (!options.overwrite) {
      try {
        const existingModule = await importModule(targetPath);
        const existingActions = existingModule.default || existingModule;
        finalAuthActions = deepmerge(existingActions, authActions);
        isUpdate = true;
      } catch (error) {}
    }

    const fileContent = `const authActions = ${JSON.stringify(finalAuthActions, null, 2)};

export default authActions;
`;

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, fileContent, "utf-8");

    console.info("");
    if (isUpdate) sheu.done("Auth actions updated and exported successfully!");
    else sheu.done("Auth actions exported successfully!");

    this.end();
  }
}

/**
 * Singleton instance of RuntimeCliCommander
 *
 * @type {RuntimeCliCommander}
 */
const runtimeCliCommander: RuntimeCliCommander = new RuntimeCliCommander();

export default runtimeCliCommander;
