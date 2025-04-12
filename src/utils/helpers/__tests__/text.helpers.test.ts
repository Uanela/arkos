import {
  capitalize,
  removeBeginningSlash,
  removeEndingSlash,
  removeBothSlashes,
} from "../text.helpers";

describe("capitalize", () => {
  it("should capitalize each word", () => {
    expect(capitalize("hello world")).toBe("Hello World");
  });

  it("should handle mixed case and extra spaces", () => {
    expect(capitalize("heLLo WoRLD")).toBe("Hello World");
  });

  it("should return empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });

  it("should handle single-word input", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("should not break with multiple spaces", () => {
    expect(capitalize("  hello   world  ")).toBe("  Hello   World  ");
  });
});

describe("removeBeginningSlash", () => {
  it("should remove beginning slash", () => {
    expect(removeBeginningSlash("/test")).toBe("test");
  });

  it("should not remove anything if no beginning slash", () => {
    expect(removeBeginningSlash("test/")).toBe("test/");
  });
});

describe("removeEndingSlash", () => {
  it("should remove ending slash", () => {
    expect(removeEndingSlash("test/")).toBe("test");
  });

  it("should not remove anything if no ending slash", () => {
    expect(removeEndingSlash("/test")).toBe("/test");
  });
});

describe("removeBothSlashes", () => {
  it("should remove both beginning and ending slashes", () => {
    expect(removeBothSlashes("/test/")).toBe("test");
  });

  it("should remove only beginning slash if no ending slash", () => {
    expect(removeBothSlashes("/test")).toBe("test");
  });

  it("should remove only ending slash if no beginning slash", () => {
    expect(removeBothSlashes("test/")).toBe("test");
  });

  it("should leave string unchanged if no slashes", () => {
    expect(removeBothSlashes("test")).toBe("test");
  });
});
