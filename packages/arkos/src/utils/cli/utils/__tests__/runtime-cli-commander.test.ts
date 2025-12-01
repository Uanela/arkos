import { authActionService } from "../../../../exports/services";
import fs from "fs/promises";
import path from "path";
import sheu from "../../../sheu";
import { getUserFileExtension } from "../../../helpers/fs.helpers";
import { importModule } from "../../../helpers/global.helpers";
import deepmerge from "../../../helpers/deepmerge.helper";
import { killDevelopmentServerChildProcess } from "../../dev";
import runtimeCliCommander from "../runtime-cli-commander";

jest.mock("../../../../exports/services");
jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));
jest.mock("fs/promises");
jest.mock("path");
jest.mock("../../../sheu");
jest.mock("../../../helpers/fs.helpers");
jest.mock("../../../helpers/global.helpers");
jest.mock("../../../helpers/deepmerge.helper");
jest.mock("../../dev");

describe("RuntimeCliCommander", () => {
  const originalEnv = process.env;
  const mockExit = jest.spyOn(process, "exit").mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  describe("getOptions", () => {
    it("returns parsed options from environment variable", () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({
        overwrite: true,
        path: "./exports",
      });

      const options = runtimeCliCommander.getOptions();

      expect(options).toEqual({ overwrite: true, path: "./exports" });
    });

    it("returns empty object when CLI_COMMAND_OPTIONS is not set", () => {
      delete process.env.CLI_COMMAND_OPTIONS;

      const options = runtimeCliCommander.getOptions();

      expect(options).toEqual({});
    });

    it("returns empty object when CLI_COMMAND_OPTIONS is empty string", () => {
      process.env.CLI_COMMAND_OPTIONS = "";

      const options = runtimeCliCommander.getOptions();

      expect(options).toEqual({});
    });
  });

  describe("end", () => {
    it("kills development server and exits process", () => {
      runtimeCliCommander.end();

      expect(killDevelopmentServerChildProcess).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("handle", () => {
    it("calls exportAuthAction when command is EXPORT_AUTH_ACTION", async () => {
      process.env.CLI_COMMAND = "EXPORT_AUTH_ACTION";
      const exportAuthActionSpy = jest
        .spyOn(runtimeCliCommander, "exportAuthAction")
        .mockResolvedValue();

      await runtimeCliCommander.handle();

      expect(exportAuthActionSpy).toHaveBeenCalledTimes(1);
      exportAuthActionSpy.mockRestore();
    });

    it("does nothing when command is not recognized", async () => {
      process.env.CLI_COMMAND = "UNKNOWN_COMMAND";
      const exportAuthActionSpy = jest.spyOn(
        runtimeCliCommander,
        "exportAuthAction"
      );

      await runtimeCliCommander.handle();

      expect(exportAuthActionSpy).not.toHaveBeenCalled();
      exportAuthActionSpy.mockRestore();
    });

    it("does nothing when CLI_COMMAND is not set", async () => {
      delete process.env.CLI_COMMAND;
      const exportAuthActionSpy = jest.spyOn(
        runtimeCliCommander,
        "exportAuthAction"
      );

      await runtimeCliCommander.handle();

      expect(exportAuthActionSpy).not.toHaveBeenCalled();
      exportAuthActionSpy.mockRestore();
    });
  });

  describe("exportAuthAction", () => {
    const mockAuthActions = {
      login: { type: "login" },
      logout: { type: "logout" },
    };
    const mockFileExtension = "ts";
    const mockTargetPath = "/project/auth-actions.ts";
    let endSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      (authActionService.getAll as jest.Mock).mockReturnValue(mockAuthActions);
      (getUserFileExtension as jest.Mock).mockReturnValue(mockFileExtension);
      (path.join as jest.Mock).mockReturnValue(mockTargetPath);
      (path.dirname as jest.Mock).mockReturnValue("/project");
      consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
      endSpy = jest.spyOn(runtimeCliCommander, "end").mockImplementation();
    });

    afterEach(() => {
      endSpy.mockRestore();
      consoleInfoSpy.mockRestore();
    });

    it("exports auth actions with default options", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
      (importModule as jest.Mock).mockRejectedValue(new Error("Not found"));

      await runtimeCliCommander.exportAuthAction();

      expect(authActionService.getAll).toHaveBeenCalledTimes(1);
      expect(getUserFileExtension).toHaveBeenCalledTimes(1);
      expect(path.join).toHaveBeenCalledWith(
        process.cwd(),
        "",
        expect.any(String)
      );
      expect(fs.mkdir).toHaveBeenCalledWith("/project", { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockTargetPath,
        expect.stringContaining("const authActions ="),
        "utf-8"
      );
      expect(sheu.done).toHaveBeenCalledWith(
        "Auth actions exported successfully!"
      );
      expect(endSpy).toHaveBeenCalledTimes(1);
    });

    it("exports auth actions with custom path", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({
        path: "./custom-exports",
      });
      (importModule as jest.Mock).mockRejectedValue(new Error("Not found"));

      await runtimeCliCommander.exportAuthAction();

      expect(path.join).toHaveBeenCalledWith(
        process.cwd(),
        "./custom-exports",
        expect.any(String)
      );
    });

    it("overwrites existing file when overwrite option is true", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: true });
      const existingActions = { signup: { type: "signup" } };
      (importModule as jest.Mock).mockResolvedValue({
        default: existingActions,
      });

      await runtimeCliCommander.exportAuthAction();

      expect(importModule).not.toHaveBeenCalled();
      expect(deepmerge).not.toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockTargetPath,
        expect.stringContaining(JSON.stringify(mockAuthActions, null, 2)),
        "utf-8"
      );
      expect(sheu.done).toHaveBeenCalledWith(
        "Auth actions exported successfully!"
      );
    });

    it("merges with existing auth actions when overwrite is false", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });
      const existingActions = { signup: { type: "signup" } };
      const mergedActions = { ...existingActions, ...mockAuthActions };
      (importModule as jest.Mock).mockResolvedValue({
        default: existingActions,
      });
      (deepmerge as any as jest.Mock).mockReturnValue(mergedActions);

      await runtimeCliCommander.exportAuthAction();

      expect(importModule).toHaveBeenCalledWith(mockTargetPath);
      expect(deepmerge).toHaveBeenCalledWith(existingActions, mockAuthActions);
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockTargetPath,
        expect.stringContaining(JSON.stringify(mergedActions, null, 2)),
        "utf-8"
      );
      expect(sheu.done).toHaveBeenCalledWith(
        "Auth actions updated and exported successfully!"
      );
    });

    it("handles existing module without default export", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });
      const existingActions = { signup: { type: "signup" } };
      const mergedActions = { ...existingActions, ...mockAuthActions };
      (importModule as jest.Mock).mockResolvedValue(existingActions);
      (deepmerge as any as jest.Mock).mockReturnValue(mergedActions);

      await runtimeCliCommander.exportAuthAction();

      expect(deepmerge).toHaveBeenCalledWith(existingActions, mockAuthActions);
    });

    it("creates directory recursively if it does not exist", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
      (importModule as jest.Mock).mockRejectedValue(new Error("Not found"));

      await runtimeCliCommander.exportAuthAction();

      expect(fs.mkdir).toHaveBeenCalledWith("/project", { recursive: true });
    });

    it("writes correctly formatted file content", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
      (importModule as jest.Mock).mockRejectedValue(new Error("Not found"));

      await runtimeCliCommander.exportAuthAction();

      const expectedContent = `const authActions = ${JSON.stringify(
        mockAuthActions,
        null,
        2
      )};

export default authActions;
`;
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockTargetPath,
        expectedContent,
        "utf-8"
      );
    });

    it("logs empty line before done message", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
      (importModule as jest.Mock).mockRejectedValue(new Error("Not found"));

      await runtimeCliCommander.exportAuthAction();

      expect(console.info).toHaveBeenCalledWith("");
    });

    it("handles import failure gracefully when not overwriting", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });
      (importModule as jest.Mock).mockRejectedValue(
        new Error("Module not found")
      );

      await runtimeCliCommander.exportAuthAction();

      expect(deepmerge).not.toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockTargetPath,
        expect.stringContaining(JSON.stringify(mockAuthActions, null, 2)),
        "utf-8"
      );
      expect(sheu.done).toHaveBeenCalledWith(
        "Auth actions exported successfully!"
      );
    });
  });
});
