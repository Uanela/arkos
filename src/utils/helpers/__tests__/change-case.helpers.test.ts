import {
  camelCase,
  pascalCase,
  pascalSnakeCase,
  capitalCase,
  constantCase,
  dotCase,
  kebabCase,
  pathCase,
  sentenceCase,
  snakeCase,
  trainCase,
  split,
  splitSeparateNumbers,
  noCase,
} from "../change-case.helpers";

describe("change-case.helpers", () => {
  const input = "HelloWorld42Test";

  test("split", () => {
    expect(split("helloWorld")).toEqual(["hello", "World"]);
    expect(split("NASAEngineer")).toEqual(["NASA", "Engineer"]);
    expect(split("123abcDEF")).toEqual(["123abc", "DEF"]);
  });

  test("splitSeparateNumbers", () => {
    expect(splitSeparateNumbers("Foo42Bar")).toEqual(["Foo", "42", "Bar"]);
  });

  test("noCase", () => {
    expect(noCase("FooBar")).toBe("foo bar");
  });

  test("camelCase", () => {
    expect(camelCase("hello world")).toBe("helloWorld");
    expect(camelCase("foo-bar_baz")).toBe("fooBarBaz");
  });

  test("pascalCase", () => {
    expect(pascalCase("hello world")).toBe("HelloWorld");
  });

  test("pascalSnakeCase", () => {
    expect(pascalSnakeCase("hello world")).toBe("Hello_World");
  });

  test("capitalCase", () => {
    expect(capitalCase("fooBar")).toBe("Foo Bar");
  });

  test("constantCase", () => {
    expect(constantCase("fooBar")).toBe("FOO_BAR");
  });

  test("dotCase", () => {
    expect(dotCase("fooBar")).toBe("foo.bar");
  });

  test("kebabCase", () => {
    expect(kebabCase("fooBar")).toBe("foo-bar");
  });

  test("pathCase", () => {
    expect(pathCase("fooBar")).toBe("foo/bar");
  });

  test("sentenceCase", () => {
    expect(sentenceCase("fooBar")).toBe("Foo bar");
  });

  test("snakeCase", () => {
    expect(snakeCase("fooBar")).toBe("foo_bar");
  });

  test("trainCase", () => {
    expect(trainCase("fooBar")).toBe("Foo-Bar");
  });
});
