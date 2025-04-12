import { parse, queryParser } from "../query-parser.helpers";

describe("parse", () => {
  const baseOptions = {
    parseNull: true,
    parseUndefined: true,
    parseBoolean: true,
    parseNumber: true,
  };

  it('parses string "null" as null', () => {
    expect(parse("null", baseOptions)).toBeNull();
  });

  it('parses string "undefined" as undefined', () => {
    expect(parse("undefined", baseOptions)).toBeUndefined();
  });

  it('parses string "true" and "false" as boolean', () => {
    expect(parse("true", baseOptions)).toBe(true);
    expect(parse("false", baseOptions)).toBe(false);
  });

  it("parses numeric strings as numbers", () => {
    expect(parse("42", baseOptions)).toBe(42);
    expect(parse("3.14", baseOptions)).toBe(3.14);
  });

  it("returns original string if no options match", () => {
    expect(parse("hello", baseOptions)).toBe("hello");
  });

  it("parses array values", () => {
    expect(parse(["true", "42"], baseOptions)).toEqual([true, 42]);
  });

  it("parses object values recursively", () => {
    const input = {
      a: "true",
      b: "42",
      c: "null",
      d: "undefined",
    };
    const result = parse({ ...input }, baseOptions);
    expect(result).toEqual({
      a: true,
      b: 42,
      c: null,
      d: undefined,
    });
  });
});

describe("queryParser middleware", () => {
  const mockReq = {
    query: {
      test: "true",
      num: "123",
      nothing: "null",
    },
  };

  const mockRes = {} as any;
  const next = jest.fn();

  it("should parse query values using options", () => {
    const middleware = queryParser({
      parseBoolean: true,
      parseNumber: true,
      parseNull: true,
    });

    const req = { ...mockReq } as any;

    middleware(req, mockRes, next);

    expect(req.query).toEqual({
      test: true,
      num: 123,
      nothing: null,
    });

    expect(next).toHaveBeenCalled();
  });
});
