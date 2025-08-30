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

    jest.spyOn(sheu, "getTimestamp").mockReturnValue("12:34:56");
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
      expect(result).toBe("[\x1b[36mInfo\x1b[0m]");
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[36mInfo\x1b[0m]");
    });

    test("info() with message should log and return formatted info label with message", () => {
      const result = sheu.info("Application started");
      expect(result).toBe("[\x1b[36mInfo\x1b[0m] Application started");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[36mInfo\x1b[0m] Application started"
      );
    });

    test("error() should log and return formatted error label", () => {
      const result = sheu.error();
      expect(result).toBe("[\x1b[31mError\x1b[0m]");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[\x1b[31mError\x1b[0m]");
    });

    test("error() with message should log and return formatted error label with message", () => {
      const result = sheu.error("Connection failed");
      expect(result).toBe("[\x1b[31mError\x1b[0m] Connection failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[\x1b[31mError\x1b[0m] Connection failed"
      );
    });

    test("ready() should log and return formatted ready label", () => {
      const result = sheu.ready();
      expect(result).toBe("[\x1b[32mReady\x1b[0m]");
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[32mReady\x1b[0m]");
    });

    test("ready() with message should log and return formatted ready label with message", () => {
      const result = sheu.ready("Server is running");
      expect(result).toBe("[\x1b[32mReady\x1b[0m] Server is running");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[32mReady\x1b[0m] Server is running"
      );
    });

    test("done() should log and return formatted done label", () => {
      const result = sheu.done();
      expect(result).toBe("[\x1b[32mDone\x1b[0m]");
      expect(consoleSpy).toHaveBeenCalledWith("[\x1b[32mDone\x1b[0m]");
    });

    test("done() with message should log and return formatted done label with message", () => {
      const result = sheu.done("Build completed");
      expect(result).toBe("[\x1b[32mDone\x1b[0m] Build completed");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[\x1b[32mDone\x1b[0m] Build completed"
      );
    });

    test("warn() should log formatted warning label", () => {
      sheu.warn();
      expect(consoleWarnSpy).toHaveBeenCalledWith("[\x1b[33mWarn\x1b[0m]");
    });

    test("warn() with message should log formatted warning label with message", () => {
      sheu.warn("Deprecated feature used");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[\x1b[33mWarn\x1b[0m] Deprecated feature used"
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

  describe("Sheu - Additional Coverage", () => {
    let consoleSpy: any;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2023-01-01T12:34:56Z"));
      consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.useRealTimers();
      consoleSpy.mockRestore();
    });

    describe("Timestamp functionality", () => {
      test("getTimestamp() should return formatted timestamp", () => {
        // Access private method for testing
        const timestamp = sheu.getTimestamp();
        expect(timestamp).toBe("12:34:56");
      });

      test("formatText() with timestamp=true should add gray timestamp", () => {
        const result = sheu.formatText("Hello", { timestamp: true });
        expect(result).toBe("\x1b[90m12:34:56\x1b[0m Hello");
      });

      test("formatText() with custom timestamp color should use that color", () => {
        const result = sheu.formatText("Hello", { timestamp: "blue" });
        expect(result).toBe("\x1b[34m12:34:56\x1b[0m Hello");
      });

      test("formatText() with timestamp and label should format correctly", () => {
        const result = sheu.formatText("Hello", {
          timestamp: true,
          label: "[Test]",
        });
        expect(result).toBe("[Test] \x1b[90m12:34:56\x1b[0m Hello");
      });

      test("formatText() with timestamp=false should not add timestamp", () => {
        const result = sheu.formatText("Hello", { timestamp: false });
        expect(result).toBe("Hello");
      });
    });

    describe("Color code mapping", () => {
      test("getColorCode() should return correct ANSI codes", () => {
        // Test all defined colors
        expect(sheu.getColorCode("red")).toBe("\x1b[31m");
        expect(sheu.getColorCode("blue")).toBe("\x1b[34m");
        expect(sheu.getColorCode("green")).toBe("\x1b[32m");
        expect(sheu.getColorCode("yellow")).toBe("\x1b[33m");
        expect(sheu.getColorCode("cyan")).toBe("\x1b[36m");
        expect(sheu.getColorCode("magenta")).toBe("\x1b[35m");
        expect(sheu.getColorCode("white")).toBe("\x1b[37m");
        expect(sheu.getColorCode("black")).toBe("\x1b[30m");
        expect(sheu.getColorCode("gray")).toBe("\x1b[90m");
        expect(sheu.getColorCode("orange")).toBe("\x1b[91m");
      });

      test("getColorCode() should return gray for unknown colors", () => {
        expect(sheu.getColorCode("unknown")).toBe("\x1b[90m");
        expect(sheu.getColorCode("")).toBe("\x1b[90m");
      });
    });

    describe("Bold formatting", () => {
      test("formatText() with bold=true should apply bold formatting", () => {
        const result = sheu.formatText("Hello", { bold: true });
        expect(result).toBe("\x1b[1mHello\x1b[0m");
      });

      test("formatText() with bold=false should not apply bold formatting", () => {
        const result = sheu.formatText("Hello", { bold: false });
        expect(result).toBe("Hello");
      });

      test("bold() method should apply bold without double-bold", () => {
        const result = sheu.bold("Hello");
        expect(result).toBe("\x1b[1mHello\x1b[0m");
      });

      test("bold() with timestamp should include timestamp", () => {
        const result = sheu.bold("Hello", { timestamp: true });
        expect(result).toBe("\x1b[1m\x1b[90m12:34:56\x1b[0m Hello\x1b[0m");
      });
    });

    describe("Label functionality", () => {
      test("formatText() with label only should return just the label", () => {
        const result = sheu.formatText("", { label: "[Test]" });
        expect(result).toBe("[Test]");
      });

      test("formatText() with label and content should format correctly", () => {
        const result = sheu.formatText("Hello", { label: "[Test]" });
        expect(result).toBe("[Test] Hello");
      });

      test("formatText() with label, timestamp, and bold should format correctly", () => {
        const result = sheu.formatText("Hello", {
          label: "[Test]",
          timestamp: true,
          bold: true,
        });
        expect(result).toBe(
          "\x1b[1m[Test] \x1b[90m12:34:56\x1b[0m Hello\x1b[0m"
        );
      });
    });

    describe("Color methods with options", () => {
      test("red() with timestamp should include timestamp", () => {
        const result = sheu.red("Hello", { timestamp: true });
        expect(result).toBe("\x1b[90m12:34:56\x1b[0m \x1b[31mHello\x1b[0m");
      });

      test("red() with bold should apply bold", () => {
        const result = sheu.red("Hello", { bold: true });
        expect(result).toBe("\x1b[1m\x1b[31mHello\x1b[0m\x1b[0m");
      });

      test("green() with custom timestamp color should use that color", () => {
        const result = sheu.green("Hello", { timestamp: "blue" });
        expect(result).toBe("\x1b[34m12:34:56\x1b[0m \x1b[32mHello\x1b[0m");
      });

      test("blue() with both timestamp and bold should apply both", () => {
        const result = sheu.blue("Hello", { timestamp: true, bold: true });
        expect(result).toBe(
          "\x1b[1m\x1b[90m12:34:56\x1b[0m \x1b[34mHello\x1b[0m\x1b[0m"
        );
      });
    });

    describe("Label methods with options", () => {
      test("info() with timestamp should include timestamp", () => {
        const result = sheu.info("Message", { timestamp: true });
        expect(result).toBe(
          "[\x1b[36mInfo\x1b[0m] \x1b[90m12:34:56\x1b[0m Message"
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          "[\x1b[36mInfo\x1b[0m] \x1b[90m12:34:56\x1b[0m Message"
        );
      });

      test("error() with bold should apply bold", () => {
        const result = sheu.error("Error message", { bold: true });
        expect(result).toBe(
          "\x1b[1m[\x1b[31mError\x1b[0m] Error message\x1b[0m"
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "\x1b[1m[\x1b[31mError\x1b[0m] Error message\x1b[0m"
        );
      });

      test("ready() with custom timestamp color should use that color", () => {
        const result = sheu.ready("Ready message", { timestamp: "green" });
        expect(result).toBe(
          "[\x1b[32mReady\x1b[0m] \x1b[32m12:34:56\x1b[0m Ready message"
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          "[\x1b[32mReady\x1b[0m] \x1b[32m12:34:56\x1b[0m Ready message"
        );
      });

      test("warn() with timestamp and bold should apply both", () => {
        const result = sheu.warn("Warning", { timestamp: true, bold: true });
        expect(result).toBe(
          "\x1b[1m[\x1b[33mWarn\x1b[0m] \x1b[90m12:34:56\x1b[0m Warning\x1b[0m"
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "\x1b[1m[\x1b[33mWarn\x1b[0m] \x1b[90m12:34:56\x1b[0m Warning\x1b[0m"
        );
      });
    });

    describe("Edge cases for formatText", () => {
      test("formatText() with undefined content should handle gracefully", () => {
        const result = sheu.formatText(undefined, { label: "[Test]" });
        expect(result).toBe("[Test]");
      });

      test("formatText() with null content should handle gracefully", () => {
        const result = sheu.formatText(null, { label: "[Test]" });
        expect(result).toBe("[Test] null");
      });

      test("formatText() with number content should convert to string", () => {
        const result = sheu.formatText(123, { label: "[Test]" });
        expect(result).toBe("[Test] 123");
      });

      test("formatText() with object content should convert to string", () => {
        const result = sheu.formatText({ key: "value" }, { label: "[Test]" });
        expect(result).toBe("[Test] [object Object]");
      });
    });
  });
});
