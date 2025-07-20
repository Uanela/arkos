import deepmerge from "../deepmerge.helper";

describe("deepmerge", () => {
  it("should merge two objects", () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const result = deepmerge(target, source);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("should merge nested objects", () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    const result = deepmerge(target, source);
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });

  it("should merge arrays", () => {
    const target = [1, 2];
    const source = [3, 4];
    const result = deepmerge(target, source);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("should handle arrays of objects", () => {
    const target = [{ a: 1 }, { b: 2 }];
    const source = [{ c: 3 }];
    const result = deepmerge(target, source);
    expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("should clone objects when merging", () => {
    const obj = { a: 1 };
    const target = { obj };
    const source = { b: 2 };
    const result = deepmerge(target, source);

    expect(result.obj).not.toBe(obj);
    expect(result.obj).toEqual(obj);
    expect(result.b).toBe(2);
  });

  it("should handle Date objects correctly", () => {
    const date = new Date();
    const target = { date };
    const source = { b: 2 };
    const result = deepmerge(target, source);

    expect(result.date).toBe(date);
    expect(result.b).toBe(2);
  });

  it("should handle RegExp objects correctly", () => {
    const regex = /test/;
    const target = { regex };
    const source = { b: 2 };
    const result = deepmerge(target, source);

    expect(result.regex).toBe(regex);
    expect(result.b).toBe(2);
  });

  it("should handle null and undefined values", () => {
    const target = { a: null, b: undefined };
    const source = { c: null, d: undefined };
    const result = deepmerge(target, source);

    expect(result).toEqual({
      a: null,
      b: undefined,
      c: null,
      d: undefined,
    });
  });

  it("should override values when source has the same key", () => {
    const target = { a: 1, b: { c: 3 } };
    const source = { a: 2, b: { d: 4 } };
    const result = deepmerge(target, source);

    expect(result).toEqual({
      a: 2,
      b: { c: 3, d: 4 },
    });
  });

  it("should handle custom arrayMerge option", () => {
    const target = [1, 2];
    const source = [3, 4];
    const customArrayMerge = (target: any[], source: any[]) => {
      return [...source, ...target];
    };

    const result = deepmerge(target, source, { arrayMerge: customArrayMerge });
    expect(result).toEqual([3, 4, 1, 2]);
  });

  it("should handle custom isMergeableObject option", () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };

    // Consider nothing mergeable, so just replace objects
    const customIsMergeableObject = () => false;

    const result = deepmerge(target, source, {
      isMergeableObject: customIsMergeableObject,
    });
    expect(result).toEqual({ a: { c: 2 } });
  });

  it("should handle custom customMerge option", () => {
    const target = { a: [1, 2], b: { c: 3 } };
    const source = { a: [3, 4], b: { d: 4 } };

    const customMerger = (key: string) => {
      if (key === "a") {
        return (x: any, y: any) =>
          [...x, ...y].filter((v, i, a) => a.indexOf(v) === i);
      }
      return undefined;
    };

    const result = deepmerge(target, source, { customMerge: customMerger });
    expect(result).toEqual({
      a: [1, 2, 3, 4],
      b: { c: 3, d: 4 },
    });
  });

  it("should handle the clone option", () => {
    const obj = { x: 1 };
    const target = { a: obj };
    const source = { b: 2 };

    const result = deepmerge(target, source, { clone: false });
    expect(result.a).toBe(obj);
  });

  it("should handle different types between target and source", () => {
    const target = { a: 1 };
    const source = [1, 2, 3];
    const result = deepmerge(target, source);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([1, 2, 3]);
  });

  describe("deepmerge.all", () => {
    it("should merge multiple objects", () => {
      const objects = [{ a: 1 }, { b: 2 }, { c: 3 }];

      const result = deepmerge.all(objects);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should merge nested objects from multiple sources", () => {
      const objects = [{ a: { x: 1 } }, { a: { y: 2 } }, { b: { z: 3 } }];

      const result = deepmerge.all(objects);
      expect(result).toEqual({
        a: { x: 1, y: 2 },
        b: { z: 3 },
      });
    });

    it("should throw an error if first argument is not an array", () => {
      expect(() => {
        // @ts-ignore - testing runtime behavior with invalid inputs
        deepmerge.all({ a: 1 });
      }).toThrow("first argument should be an array");
    });

    it("should handle custom options", () => {
      const objects = [{ a: [1, 2] }, { a: [3, 4] }, { b: 5 }];

      const customArrayMerge = (target: any[], source: any[]) => {
        return [...source, ...target];
      };

      const result = deepmerge.all(objects, { arrayMerge: customArrayMerge });
      expect(result).toEqual({
        a: [3, 4, 1, 2],
        b: 5,
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle symbol properties", () => {
      const sym = Symbol("test");
      const target = { [sym]: 1 };
      const source = { b: 2 };

      const result = deepmerge(target, source);
      expect(result[sym]).toBe(1);
      expect(result.b).toBe(2);
    });

    it("should handle property that exists but is not enumerable", () => {
      const target = {};
      Object.defineProperty(target, "nonEnumProp", {
        enumerable: false,
        value: 1,
      });

      const source = { visible: true };
      const result = deepmerge(target, source);

      expect(result).toEqual({ visible: true });
      // The non-enumerable property should not be copied
      expect(
        Object.getOwnPropertyDescriptor(result, "nonEnumProp")
      ).toBeUndefined();
    });

    it("should handle objects with prototype chain", () => {
      function Parent() {}
      Parent.prototype.parentProp = "parent";

      function Child() {
        // @ts-ignore - prototype inheritance for test
        this.childProp = "child";
      }
      Child.prototype = Object.create(Parent.prototype);

      // @ts-ignore - instance for test
      const target = new Child();
      const source: { newProp: string; childProp?: string } = {
        newProp: "new",
      };

      const result = deepmerge(target, source);

      expect(result.childProp).toBe("child");
      expect(result.newProp).toBe("new");
      // Should not merge properties from prototype chain
      expect(result.hasOwnProperty("parentProp")).toBe(false);
    });
  });
});
