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
jest.mock("../../../helpers/fs.helpers", () => ({
  fullCleanCwd: jest.fn((val: any) => val),
  getUserFileExtension: jest.fn(),
}));
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
    const mockAuthActions = [
      { action: "Login", resource: "auth" },
      { action: "Logout", resource: "auth" },
    ];
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
        "Auth actions exported successfully at /project/auth-actions.ts"
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
        "Auth actions exported successfully at /project/auth-actions.ts"
      );
    });

    it("merges with existing auth actions when overwrite is false", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });
      const existingActions = { action: "Signup", resource: "auth" };
      const mergedActions = [...mockAuthActions, existingActions];
      (importModule as jest.Mock).mockResolvedValue({
        default: [existingActions],
      });

      await runtimeCliCommander.exportAuthAction();

      expect(importModule).toHaveBeenCalledWith(mockTargetPath);
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockTargetPath,
        expect.stringContaining(JSON.stringify(mergedActions, null, 2)),
        "utf-8"
      );
      expect(sheu.done).toHaveBeenCalledWith(
        "Auth actions updated and exported successfully at /project/auth-actions.ts"
      );
    });

    it("handles existing module without default export", async () => {
      process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });
      const existingActions = { signup: { type: "signup" } };
      const mergedActions = { ...existingActions, ...mockAuthActions };
      (importModule as jest.Mock).mockResolvedValue(existingActions);
      (deepmerge as any as jest.Mock).mockReturnValue(mergedActions);

      await runtimeCliCommander.exportAuthAction();

      // expect(deepmerge).toHaveBeenCalledWith(existingActions, mockAuthActions);
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
      )} as const;

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
        "Auth actions exported successfully at /project/auth-actions.ts"
      );
    });

    describe("Role Changes Detection and User Confirmation", () => {
      const mockAuthActions = [
        { action: "Login", resource: "auth", roles: ["user", "admin"] },
        { action: "Logout", resource: "auth", roles: ["user"] },
      ];
      const mockTargetPath = "/project/auth-actions.ts";
      let endSpy: jest.SpyInstance;
      let mockStdoutWrite: jest.SpyInstance;
      let mockStdinOnce: jest.SpyInstance;
      let mockStdinPause: jest.SpyInstance;

      beforeEach(() => {
        (authActionService.getAll as jest.Mock).mockReturnValue(
          mockAuthActions
        );
        (getUserFileExtension as jest.Mock).mockReturnValue("ts");
        (path.join as jest.Mock).mockReturnValue(mockTargetPath);
        (path.dirname as jest.Mock).mockReturnValue("/project");
        endSpy = jest.spyOn(runtimeCliCommander, "end").mockImplementation();

        mockStdoutWrite = jest
          .spyOn(process.stdout, "write")
          .mockImplementation();
        mockStdinOnce = jest.spyOn(process.stdin, "once").mockImplementation();
        mockStdinPause = jest
          .spyOn(process.stdin, "pause")
          .mockImplementation();
      });

      afterEach(() => {
        endSpy.mockRestore();
        mockStdoutWrite.mockRestore();
        mockStdinOnce.mockRestore();
        mockStdinPause.mockRestore();
      });

      it("should detect role changes and warn user", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(sheu.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            "Roles for the following permissions will be updated"
          )
        );
        expect(sheu.warn).toHaveBeenCalledWith(
          expect.stringContaining("Login:auth: [user] → [admin, user]")
        );
      });

      it("should prompt user to confirm role updates", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["guest"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(mockStdoutWrite).toHaveBeenCalledWith(
          expect.stringContaining(
            "Do you want to proceed with updating these roles? (Y/n):"
          )
        );
      });

      it("should proceed when user answers 'y'", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["guest"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(fs.writeFile).toHaveBeenCalled();
        expect(sheu.done).toHaveBeenCalledWith(
          expect.stringContaining(
            "Auth actions updated and exported successfully"
          )
        );
      });

      it("should proceed when user presses Enter (default yes)", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["guest"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(fs.writeFile).toHaveBeenCalled();
      });

      // it("should throw error when user answers 'n'", async () => {
      //   process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

      //   const existingActions = [
      //     { action: "Login", resource: "auth", roles: ["guest"] },
      //   ];

      //   (importModule as jest.Mock).mockResolvedValue({
      //     default: existingActions,
      //   });

      //   mockStdinOnce.mockImplementation((event, callback) => {
      //     callback(Buffer.from("n\n"));
      //     return process.stdin;
      //   });

      //   try {
      //     await runtimeCliCommander.exportAuthAction();
      //     // If we reach here, the test should fail
      //     expect(true).toBe(false);
      //   } catch (error: any) {
      //     expect(error.message).toBe("Auth action export cancelled");
      //     expect(mockStdinPause).toHaveBeenCalled();
      //   }
      // });

      // it("should include overwrite command hint in error message", async () => {
      //   process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

      //   const existingActions = [
      //     { action: "Login", resource: "auth", roles: ["guest"] },
      //   ];

      //   (importModule as jest.Mock).mockResolvedValue({
      //     default: existingActions,
      //   });

      //   mockStdinOnce.mockImplementation((event, callback) => {
      //     callback(Buffer.from("n\n"));
      //     return process.stdin;
      //   });

      //   try {
      //     await runtimeCliCommander.exportAuthAction();
      //     // If we reach here, the test should fail
      //     expect(true).toBe(false);
      //   } catch (error: any) {
      //     expect(error.message).toBe(
      //       "npx arkos export auth-action --overwrite"
      //     );
      //   }
      // });
      it("should detect multiple role changes", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["guest"] },
          { action: "Logout", resource: "auth", roles: ["admin", "guest"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(sheu.warn).toHaveBeenCalledWith(
          expect.stringMatching(/Login:auth.*\n.*Logout:auth/)
        );
      });

      it("should not prompt when no role changes detected", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["admin", "user"] },
          { action: "Logout", resource: "auth", roles: ["user"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        await runtimeCliCommander.exportAuthAction();

        expect(sheu.warn).not.toHaveBeenCalled();
        expect(mockStdoutWrite).not.toHaveBeenCalled();
      });

      it("should handle existing actions without roles", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [{ action: "Login", resource: "auth" }];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(sheu.warn).toHaveBeenCalledWith(
          expect.stringContaining("Login:auth: [] → [admin, user]")
        );
      });

      it("should handle new actions without roles", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const mockActionsWithoutRoles = [{ action: "Login", resource: "auth" }];

        (authActionService.getAll as jest.Mock).mockReturnValue(
          mockActionsWithoutRoles
        );

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(sheu.warn).toHaveBeenCalledWith(
          expect.stringContaining("Login:auth: [user] → []")
        );
      });

      it("should trim and lowercase user input", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["guest"] },
        ];

        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("  Y  \n"));
          return process.stdin;
        });

        await runtimeCliCommander.exportAuthAction();

        expect(fs.writeFile).toHaveBeenCalled();
      });
    });

    describe("Action Merging Logic", () => {
      const mockTargetPath = "/project/auth-actions.ts";
      let endSpy: jest.SpyInstance;

      beforeEach(() => {
        (getUserFileExtension as jest.Mock).mockReturnValue("ts");
        (path.join as jest.Mock).mockReturnValue(mockTargetPath);
        (path.dirname as jest.Mock).mockReturnValue("/project");
        endSpy = jest.spyOn(runtimeCliCommander, "end").mockImplementation();
      });

      afterEach(() => {
        endSpy.mockRestore();
      });

      it("should merge new actions with existing ones", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const newActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
        ];

        const existingActions = [
          { action: "Signup", resource: "auth", roles: ["guest"] },
        ];

        (authActionService.getAll as jest.Mock).mockReturnValue(newActions);
        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        expect(writeCall).toContain("Login");
        expect(writeCall).toContain("Signup");
      });

      it("should preserve existing action properties but override roles", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const newActions = [
          { action: "Login", resource: "auth", roles: ["admin", "user"] },
        ];

        const existingActions = [
          {
            action: "Login",
            resource: "auth",
            roles: ["guest"],
            customProp: "custom-value",
            metadata: { key: "value" },
          },
        ];

        (authActionService.getAll as jest.Mock).mockReturnValue(newActions);
        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        const mockStdinOnce = jest
          .spyOn(process.stdin, "once")
          .mockImplementation((event, callback: any) => {
            callback(Buffer.from("y\n"));
            return process.stdin;
          });

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        const writtenContent = JSON.parse(
          writeCall.match(/const authActions = (.*) as const;/s)[1]
        );

        const loginAction = writtenContent.find(
          (a: any) => a.action === "Login"
        );

        expect(loginAction.roles).toEqual(["admin", "user"]);
        expect(loginAction.customProp).toBe("custom-value");
        expect(loginAction.metadata).toEqual({ key: "value" });

        mockStdinOnce.mockRestore();
      });

      it("should handle actions only in new array", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const newActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
          { action: "Delete", resource: "auth", roles: ["admin"] },
        ];

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
        ];

        (authActionService.getAll as jest.Mock).mockReturnValue(newActions);
        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        expect(writeCall).toContain("Delete");
        expect(writeCall).toContain("Login");
      });

      it("should handle actions only in existing array", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({ overwrite: false });

        const newActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
        ];

        const existingActions = [
          { action: "Login", resource: "auth", roles: ["user"] },
          { action: "LegacyAction", resource: "auth", roles: ["admin"] },
        ];

        (authActionService.getAll as jest.Mock).mockReturnValue(newActions);
        (importModule as jest.Mock).mockResolvedValue({
          default: existingActions,
        });

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        expect(writeCall).toContain("LegacyAction");
        expect(writeCall).toContain("Login");
      });
    });

    describe("File Content Generation", () => {
      const mockTargetPath = "/project/auth-actions";
      let endSpy: jest.SpyInstance;

      beforeEach(() => {
        (authActionService.getAll as jest.Mock).mockReturnValue([
          { action: "Login", resource: "auth", roles: ["user"] },
        ]);
        (path.join as jest.Mock).mockImplementation(
          (base, dir, file) => `${mockTargetPath}.${file.split(".")[1]}`
        );
        (path.dirname as jest.Mock).mockReturnValue("/project");
        endSpy = jest.spyOn(runtimeCliCommander, "end").mockImplementation();
        (importModule as jest.Mock).mockRejectedValue(new Error("Not found"));
      });

      afterEach(() => {
        endSpy.mockRestore();
      });

      it("should add 'as const' for TypeScript files", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
        (getUserFileExtension as jest.Mock).mockReturnValue("ts");

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        expect(writeCall).toContain("as const");
      });

      it("should not add 'as const' for JavaScript files", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
        (getUserFileExtension as jest.Mock).mockReturnValue("js");

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        expect(writeCall).not.toContain("as const");
      });

      it("should properly format exported content", async () => {
        process.env.CLI_COMMAND_OPTIONS = JSON.stringify({});
        (getUserFileExtension as jest.Mock).mockReturnValue("ts");

        await runtimeCliCommander.exportAuthAction();

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0][1];
        expect(writeCall).toMatch(
          /const authActions = \[[\s\S]*\] as const;\n\nexport default authActions;\n/
        );
      });
    });
  });
});
