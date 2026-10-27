import path from "path";
import {
  assertSafeUploadPath,
  isPathInside,
  isSafeUploadParam,
  isSafeUploadSegment,
  normalizeUploadDir,
  normalizeUploadUrlPath,
  resolveUploadPath,
} from "../upload-path.helper";

describe("upload-path helpers", () => {
  beforeEach(() => {
    jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("isSafeUploadSegment", () => {
    it.each(["images", "acme_corp", "v1.2", "file-1.png", ":tenant"])(
      "accepts %s",
      (segment) => {
        expect(isSafeUploadSegment(segment, true)).toBe(true);
      }
    );

    it.each(["", ".", "..", ".hidden", "name.", "name ", "CON", "a/b", "a\\b"])(
      "rejects %s",
      (segment) => {
        expect(isSafeUploadSegment(segment)).toBe(false);
      }
    );

    it("only accepts params when allowParam is set", () => {
      expect(isSafeUploadSegment(":tenant")).toBe(false);
      expect(isSafeUploadSegment(":tenant", true)).toBe(true);
    });
  });

  describe("assertSafeUploadPath", () => {
    it("accepts nested relative paths", () => {
      expect(() => assertSafeUploadPath("storage/acme/files")).not.toThrow();
    });

    it.each([
      "/absolute",
      "with\\backslash",
      "with\0null",
      "trailing/",
      "nested/../escape",
      "nested/./file",
    ])("rejects %s", (value) => {
      expect(() => assertSafeUploadPath(value)).toThrow();
    });

    it("accepts params when allowed", () => {
      expect(() =>
        assertSafeUploadPath("users/:userId/files", { allowParams: true })
      ).not.toThrow();
    });
  });

  describe("normalization", () => {
    it("strips leading and trailing slashes from dirs", () => {
      expect(normalizeUploadDir("/storage/acme/")).toBe("storage/acme");
    });

    it("adds a leading and removes trailing slashes from URL paths", () => {
      expect(normalizeUploadUrlPath("private/files/")).toBe("/private/files");
      expect(normalizeUploadUrlPath("/private/files")).toBe("/private/files");
    });

    it("keeps the root URL path intact", () => {
      expect(normalizeUploadUrlPath("/")).toBe("/");
    });
  });

  describe("isSafeUploadParam", () => {
    it("accepts simple values", () => {
      expect(isSafeUploadParam("acme")).toBe(true);
      expect(isSafeUploadParam("acme-1_2")).toBe(true);
    });

    it.each(["", ".", "..", "../x", "x/y", "x\\y", "CON", "name.", "name "])(
      "rejects %s",
      (value) => {
        expect(isSafeUploadParam(value)).toBe(false);
      }
    );

    it("rejects non-strings", () => {
      expect(isSafeUploadParam(undefined)).toBe(false);
      expect(isSafeUploadParam(42)).toBe(false);
    });
  });

  describe("isPathInside", () => {
    const base = path.resolve("/tmp/arkos/uploads");

    it("accepts the base and descendants", () => {
      expect(isPathInside(base, base)).toBe(true);
      expect(isPathInside(base, path.join(base, "images/a.png"))).toBe(true);
    });

    it("rejects parents and siblings", () => {
      expect(isPathInside(base, path.resolve(base, ".."))).toBe(false);
      expect(isPathInside(base, path.resolve(base, "../secret"))).toBe(false);
    });
  });

  describe("resolveUploadPath", () => {
    const root = path.resolve(process.cwd(), "uploads");

    it("resolves nested files inside the root", () => {
      expect(resolveUploadPath(root, "images/a/b.png")).toBe(
        path.join(root, "images/a/b.png")
      );
    });

    it("strips leading slashes", () => {
      expect(resolveUploadPath(root, "/images/a.png")).toBe(
        path.join(root, "images/a.png")
      );
    });

    it.each(["../secret", "images/../../secret", "a/./b", "a//b"])(
      "rejects %s",
      (relative) => {
        expect(resolveUploadPath(root, relative)).toBeNull();
      }
    );

    it("rejects backslashes and null bytes", () => {
      expect(resolveUploadPath(root, "images\\a.png")).toBeNull();
      expect(resolveUploadPath(root, "images\0a.png")).toBeNull();
    });

    it("rejects unsafe segments in strict mode", () => {
      expect(
        resolveUploadPath(root, "images/.hidden", { strictSegments: true })
      ).toBeNull();
      expect(
        resolveUploadPath(root, "images/a b.png", { strictSegments: true })
      ).toBeNull();
      expect(
        resolveUploadPath(root, "images/a.png", { strictSegments: true })
      ).toBe(path.join(root, "images/a.png"));
    });

    it("returns the root for an empty relative path", () => {
      expect(resolveUploadPath(root, "")).toBe(root);
    });
  });
});
