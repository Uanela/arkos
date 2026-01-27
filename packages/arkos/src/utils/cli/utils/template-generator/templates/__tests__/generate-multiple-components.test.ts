import sheu from "../../../../../sheu";
import { generateCommand } from "../../../../generate";
import generateMultipleComponents from "../generate-multiple-components";

jest.mock("../../../../generate", () => ({
  generateCommand: {
    service: jest.fn(),
    controller: jest.fn(),
    router: jest.fn(),
    baseSchema: jest.fn(),
    createSchema: jest.fn(),
    updateSchema: jest.fn(),
    querySchema: jest.fn(),
    baseDto: jest.fn(),
    createDto: jest.fn(),
    updateDto: jest.fn(),
    queryDto: jest.fn(),
    prismaModel: jest.fn(),
    authConfigs: jest.fn(),
    queryOptions: jest.fn(),
    interceptors: jest.fn(),
    hooks: jest.fn(),
  },
}));

jest.mock("../../../../../sheu");

describe("generateMultipleComponents", () => {
  const defaultOptions = { module: "user-profile" };

  beforeEach(() => {
    jest.clearAllMocks();
    // Silence console for clean test output
    console.log = jest.fn();
    console.info = jest.fn();
  });

  test("should throw error if module name is missing", async () => {
    await expect(
      generateMultipleComponents({ all: true } as any)
    ).rejects.toThrow("Module name is required");
  });

  test("should throw error if neither --all nor --names is provided", async () => {
    await expect(
      generateMultipleComponents({ module: "user" } as any)
    ).rejects.toThrow("Please specify either --all or --components flag");
  });

  test("should generate all components when --all is true", async () => {
    await generateMultipleComponents({ ...defaultOptions, all: true });

    expect(sheu.info).toHaveBeenCalledWith(
      expect.stringContaining("Generating all components")
    );
    // Check a few key components to ensure they were called
    expect(generateCommand.service).toHaveBeenCalled();
    expect(generateCommand.prismaModel).toHaveBeenCalled();
    expect(generateCommand.controller).toHaveBeenCalled();
    expect(sheu.done).toHaveBeenCalled();
  });

  test("should generate specific components using shorthand codes", async () => {
    await generateMultipleComponents({
      ...defaultOptions,
      names: "s,m,c", // service, model, controller
    });

    expect(generateCommand.service).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "user-profile",
        isBulk: true,
      })
    );
    expect(generateCommand.prismaModel).toHaveBeenCalled();
    expect(generateCommand.controller).toHaveBeenCalled();

    // Ensure others were NOT called
    expect(generateCommand.router).not.toHaveBeenCalled();
  });

  test("should handle unknown components and log a warning", async () => {
    await generateMultipleComponents({
      ...defaultOptions,
      names: "service, invalid-comp",
    });

    expect(sheu.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown component: "invalid-comp"')
    );
    expect(generateCommand.service).toHaveBeenCalled();
  });

  test("should throw error if names provided but none are valid", async () => {
    await expect(
      generateMultipleComponents({
        ...defaultOptions,
        names: "xyz,abc",
      })
    ).rejects.toThrow("No valid components specified.");
  });

  test("should continue and log error if one component fails", async () => {
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit(1)");
    });

    (generateCommand.service as jest.Mock).mockRejectedValue(
      new Error("Disk Full")
    );

    // We expect the process.exit(1) to be triggered at the end
    await expect(
      generateMultipleComponents({
        ...defaultOptions,
        names: "s,m",
      })
    ).rejects.toThrow("process.exit(1)");

    expect(sheu.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to generate service because Disk Full")
    );
    expect(generateCommand.prismaModel).toHaveBeenCalled(); // Should still run the next one

    exitSpy.mockRestore();
  });

  test("should use correct default paths for specific components", async () => {
    await generateMultipleComponents({
      ...defaultOptions,
      names: "model,create-dto",
    });

    expect(generateCommand.prismaModel).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "prisma/schema",
      })
    );
    expect(generateCommand.createDto).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "src/modules/{{module-name}}/dtos",
      })
    );
  });
});
