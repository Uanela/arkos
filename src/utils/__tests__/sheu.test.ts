import innerSheu from "../sheu"; // Adjust the import path as needed

const sheu: any = innerSheu;

describe("Sheu Terminal Color Utility", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
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

  describe("Color Methods - Chaining", () => {
    test("red() without text should return chainable instance", () => {
      const result = sheu.red();
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.apply).toBe("function");
    });

    test("blue() without text should return chainable instance", () => {
      const result = sheu.blue();
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.apply).toBe("function");
    });

    test("bold() without text should return chainable instance", () => {
      const result = sheu.bold();
      expect(result).toBeInstanceOf(Object);
      expect(typeof result.apply).toBe("function");
    });
  });

  describe("Chaining Functionality", () => {
    test("should chain red and bold", () => {
      const result = sheu.red().bold().apply("Hello");
      expect(result).toBe("\x1b[31m\x1b[1mHello\x1b[0m");
    });

    test("should chain blue and bold", () => {
      const result = sheu.blue().bold().apply("World");
      expect(result).toBe("\x1b[34m\x1b[1mWorld\x1b[0m");
    });

    test("should chain multiple colors (last one should take precedence)", () => {
      const result = sheu.red().blue().apply("Test");
      expect(result).toBe("\x1b[31m\x1b[34mTest\x1b[0m");
    });

    test("should chain bold and green", () => {
      const result = sheu.bold().green().apply("Success");
      expect(result).toBe("\x1b[1m\x1b[32mSuccess\x1b[0m");
    });

    test("should maintain separate instances when chaining", () => {
      const redInstance = sheu.red();
      const blueInstance = sheu.blue();

      const redResult = redInstance.apply("Red Text");
      const blueResult = blueInstance.apply("Blue Text");

      expect(redResult).toBe("\x1b[31mRed Text\x1b[0m");
      expect(blueResult).toBe("\x1b[34mBlue Text\x1b[0m");
    });
  });

  describe("Apply Method", () => {
    test("apply() should work with accumulated codes", () => {
      const instance = sheu.red().bold();
      const result = instance.apply("Styled Text");
      expect(result).toBe("\x1b[31m\x1b[1mStyled Text\x1b[0m");
    });

    test("apply() should work with empty codes", () => {
      const instance = new sheu.constructor();
      const result = instance.apply("Plain Text");
      expect(result).toBe("Plain Text\x1b[0m");
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
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[31mERROR\x1b[0m]");
    });

    test("error() with message should log and return formatted error label with message", () => {
      const result = sheu.error("Connection failed");
      expect(result).toBe("[\x1b[31mERROR\x1b[0m] Connection failed");
      expect(consoleSpy).toHaveBeenCalledWith(
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
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[33mWARN\x1b[0m]");
    });

    test("warn() with message should log formatted warning label with message", () => {
      sheu.warn("Deprecated feature used");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[33mWARN\x1b[0m] Deprecated feature used"
      );
    });
  });

  describe("Instance Creation and Isolation", () => {
    test("should create independent instances", () => {
      const instance1 = sheu.red();
      const instance2 = sheu.blue();

      expect(instance1).not.toBe(instance2);
      expect(instance1.apply("Test")).toBe("\x1b[31mTest\x1b[0m");
      expect(instance2.apply("Test")).toBe("\x1b[34mTest\x1b[0m");
    });

    test("chaining should not affect original instance", () => {
      const redInstance = sheu.red();
      const redBoldInstance = redInstance.bold();

      expect(redInstance.apply("Test")).toBe("\x1b[31mTest\x1b[0m");
      expect(redBoldInstance.apply("Test")).toBe("\x1b[31m\x1b[1mTest\x1b[0m");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty strings", () => {
      const result = sheu.red("");
      expect(result).toBe("\x1b[31m\x1b[0m");
    });

    test("should handle undefined text parameter", () => {
      const result = sheu.red(undefined);
      expect(result).toBeInstanceOf(Object);
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

    test("should always end with reset code", () => {
      expect(sheu.red("test")).toContain("\x1b[0m");
      expect(sheu.bold("test")).toContain("\x1b[0m");
      expect(sheu.red().bold().apply("test")).toContain("\x1b[0m");
    });
  });
});
