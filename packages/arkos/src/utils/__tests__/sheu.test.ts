import innerSheu from "../sheu"; // Adjust the import path as needed

const sheu: any = innerSheu;

describe("Sheu Terminal Color Utility", () => {
  let consoleSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("Color Methods - Direct Usage", () => {
    test("red() should return red colored text", () => {
      const result = sheu.red("Hello");
      expect(result).toBe("\x1b[31mHello\x1b[0m");
    });

    test("blue() should return blue colored text", () => {
      const result = sheu.blue("Hello");
      expect(result).toBe("\x1b[34mHello\x1b[0m");
    });

    test("green() should return green colored text", () => {
      const result = sheu.green("Hello");
      expect(result).toBe("\x1b[32mHello\x1b[0m");
    });

    test("yellow() should return yellow colored text", () => {
      const result = sheu.yellow("Hello");
      expect(result).toBe("\x1b[33mHello\x1b[0m");
    });

    test("cyan() should return cyan colored text", () => {
      const result = sheu.cyan("Hello");
      expect(result).toBe("\x1b[36mHello\x1b[0m");
    });

    test("magenta() should return magenta colored text", () => {
      const result = sheu.magenta("Hello");
      expect(result).toBe("\x1b[35mHello\x1b[0m");
    });

    test("white() should return white colored text", () => {
      const result = sheu.white("Hello");
      expect(result).toBe("\x1b[37mHello\x1b[0m");
    });

    test("black() should return black colored text", () => {
      const result = sheu.black("Hello");
      expect(result).toBe("\x1b[30mHello\x1b[0m");
    });

    test("gray() should return gray colored text", () => {
      const result = sheu.gray("Hello");
      expect(result).toBe("\x1b[90mHello\x1b[0m");
    });

    test("orange() should return orange colored text", () => {
      const result = sheu.orange("Hello");
      expect(result).toBe("\x1b[91mHello\x1b[0m");
    });

    test("bold() should return bold text", () => {
      const result = sheu.bold("Hello");
      expect(result).toBe("\x1b[1mHello\x1b[0m");
    });
  });

  describe("Label Methods", () => {
    test("info() should log and return formatted info label", () => {
      const result = sheu.info();
      expect(result).toBe("[\x1b[36mINFO\x1b[0m]");
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[36mINFO\x1b[0m]");
    });

    test("info() with message should log and return formatted info label with message", () => {
      const result = sheu.info("Application started");
      expect(result).toBe("[\x1b[36mINFO\x1b[0m] Application started");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[36mINFO\x1b[0m] Application started"
      );
    });

    test("error() should log and return formatted error label", () => {
      const result = sheu.error();
      expect(result).toBe("[\x1b[31mERROR\x1b[0m]");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[\x1b[31mERROR\x1b[0m]");
    });

    test("error() with message should log and return formatted error label with message", () => {
      const result = sheu.error("Connection failed");
      expect(result).toBe("[\x1b[31mERROR\x1b[0m] Connection failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[\x1b[31mERROR\x1b[0m] Connection failed"
      );
    });

    test("ready() should log and return formatted ready label", () => {
      const result = sheu.ready();
      expect(result).toBe("[\x1b[32mREADY\x1b[0m]");
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[32mREADY\x1b[0m]");
    });

    test("ready() with message should log and return formatted ready label with message", () => {
      const result = sheu.ready("Server is running");
      expect(result).toBe("[\x1b[32mREADY\x1b[0m] Server is running");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[32mREADY\x1b[0m] Server is running"
      );
    });

    test("done() should log and return formatted done label", () => {
      const result = sheu.done();
      expect(result).toBe("[\x1b[32mDONE\x1b[0m]");
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[32mDONE\x1b[0m]");
    });

    test("done() with message should log and return formatted done label with message", () => {
      const result = sheu.done("Build completed");
      expect(result).toBe("[\x1b[32mDONE\x1b[0m] Build completed");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[32mDONE\x1b[0m] Build completed"
      );
    });

    test("warn() should log formatted warning label", () => {
      sheu.warn();
      expect(consoleWarnSpy).toHaveBeenCalledWith("[\x1b[33mWARN\x1b[0m]");
    });

    test("warn() with message should log formatted warning label with message", () => {
      sheu.warn("Deprecated feature used");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[\x1b[33mWARN\x1b[0m] Deprecated feature used"
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty strings", () => {
      const result = sheu.red("");
      expect(result).toBe("\x1b[31m\x1b[0m");
    });

    test("should handle special characters in text", () => {
      const result = sheu.red("Hello\nWorld\t!");
      expect(result).toBe("\x1b[31mHello\nWorld\t!\x1b[0m");
    });

    test("should handle numeric text", () => {
      const result = sheu.red("123");
      expect(result).toBe("\x1b[31m123\x1b[0m");
    });
  });

  describe("ANSI Code Validation", () => {
    test("should use correct ANSI codes for colors", () => {
      expect(sheu.red("test")).toContain("\x1b[31m");
      expect(sheu.blue("test")).toContain("\x1b[34m");
      expect(sheu.green("test")).toContain("\x1b[32m");
      expect(sheu.yellow("test")).toContain("\x1b[33m");
      expect(sheu.cyan("test")).toContain("\x1b[36m");
      expect(sheu.magenta("test")).toContain("\x1b[35m");
      expect(sheu.white("test")).toContain("\x1b[37m");
      expect(sheu.black("test")).toContain("\x1b[30m");
      expect(sheu.gray("test")).toContain("\x1b[90m");
      expect(sheu.orange("test")).toContain("\x1b[91m");
    });

    test("should use correct ANSI code for bold", () => {
      expect(sheu.bold("test")).toContain("\x1b[1m");
    });
  });
});
