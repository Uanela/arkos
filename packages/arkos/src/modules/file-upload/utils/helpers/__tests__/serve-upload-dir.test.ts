import express from "express";
import fs from "fs";
import path from "path";
import ArkosRouter from "../../../../../utils/arkos-router";
import { getArkosConfig } from "../../../../../server";
import { serveUploadDir } from "../serve-upload-dir";
import { uploadServingRegistry } from "../upload-serving.registry";

jest.mock("../../../../../server", () => ({
  getArkosConfig: jest.fn(),
}));

jest.mock("../../../../../utils/arkos-router", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../upload-path.helper", () => ({
  ...jest.requireActual("../upload-path.helper"),
  isRealPathInside: jest.fn().mockResolvedValue(true),
}));

const baseUploadDir = path.resolve(process.cwd(), "uploads");

describe("serveUploadDir", () => {
  let fakeRouter: { get: jest.Mock };
  let getArguments: any[];
  let statSpy: jest.SpyInstance;

  beforeEach(() => {
    uploadServingRegistry.reset();
    jest.clearAllMocks();

    getArguments = [];
    fakeRouter = { get: jest.fn() };
    (ArkosRouter as unknown as jest.Mock).mockReturnValue(fakeRouter);

    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "uploads",
        expressStatic: {},
      },
    });

    (express.static as unknown as jest.Mock).mockImplementation(
      (root: string, _options: any) => {
        const handler: any = jest.fn((req, _res, next) => {
          getArguments.push({ root, url: req.url });
          next();
        });
        return handler;
      }
    );

    statSpy = jest
      .spyOn(fs.promises, "stat")
      .mockResolvedValue({ isFile: () => false, isDirectory: () => true } as any);

    jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const getFileRouteArgs = () => fakeRouter.get.mock.calls[0];
  const getFolderRouteArgs = () => fakeRouter.get.mock.calls[1];
  const getStaticHandler = (routeIndex = 0) => {
    const [, resolveDirectory, serveFile] = fakeRouter.get.mock.calls[routeIndex];
    return { resolveDirectory, serveFile };
  };

  it("defaults the public path to /<dir> and serves direct files only", () => {
    serveUploadDir("storage/acme");

    expect(getFileRouteArgs()[0].path).toBe("/storage/acme");
    expect(getFolderRouteArgs()[0].path).toBe("/storage/acme/:fileName");
    expect(getFolderRouteArgs().length).toBe(4);
  });

  it("accepts a custom urlPath relative to baseRoute", () => {
    serveUploadDir("storage/acme", { urlPath: "/private/files" });

    expect(getFolderRouteArgs()[0].path).toBe("/private/files/:fileName");
  });

  it("rejects the root URL path", () => {
    expect(() => serveUploadDir("storage/acme", { urlPath: "/" })).toThrow();
  });

  it("normalizes a leading slash instead of rejecting it", () => {
    serveUploadDir("/storage/acme");

    expect(uploadServingRegistry.getServeRegistrations()[0].dir).toBe(
      "storage/acme"
    );
    expect(getFolderRouteArgs()[0].path).toBe("/storage/acme/:fileName");
  });

  it("rejects traversing directories", () => {
    expect(() => serveUploadDir("../storage/acme")).toThrow();
  });

  it("requires a prepare function for dynamic directories", () => {
    expect(() =>
      serveUploadDir("users/:userId/files", {
        urlPath: "/users/:userId/files",
      })
    ).toThrow();
  });

  it("accepts dynamic directories with a prepare function", () => {
    expect(() =>
      serveUploadDir("users/:userId/files", {
        urlPath: "/users/:userId/files",
        prepare: () => ({ dirParams: { userId: "1" } }),
      })
    ).not.toThrow();
  });

  it("uses a single file param when recursive is false", () => {
    serveUploadDir("storage/acme", { recursive: false });

    expect(getFolderRouteArgs()[0].path).toBe("/storage/acme/:fileName");
  });

  it("uses a wildcard when recursive is true", () => {
    serveUploadDir("storage/acme", { recursive: true });

    expect(getFolderRouteArgs()[0].path).toBe("/storage/acme/*");
  });

  it("registers the directory for startup validation", () => {
    serveUploadDir("storage/acme", { urlPath: "/private/files" });

    expect(uploadServingRegistry.getServeRegistrations()).toEqual([
      expect.objectContaining({
        dir: "storage/acme",
        urlPath: "/private/files",
        recursive: false,
        dynamic: false,
        hasPrepare: false,
        dirParams: [],
        pathParams: [],
      }),
    ]);
  });

  it("records prepare presence for dynamic directories", () => {
    const prepare = () => ({ dirParams: { userId: "1" } });
    serveUploadDir("users/:userId/files", {
      urlPath: "/users/:userId/files",
      prepare,
    });

    expect(uploadServingRegistry.getServeRegistrations()).toEqual([
      expect.objectContaining({
        dir: "users/:userId/files",
        dynamic: true,
        hasPrepare: true,
        dirParams: ["userId"],
        pathParams: ["userId"],
      }),
    ]);
  });

  it("resolves dynamic directories only from prepare", async () => {
    const prepare = jest
      .fn()
      .mockResolvedValue({ dirParams: { userId: "42" } });
    serveUploadDir("users/:userId/files", {
      urlPath: "/users/:userId/files",
      prepare,
    });

    const { resolveDirectory } = getStaticHandler(1);
    const next = jest.fn();
    const locals = { tenant: "acme" };
    const req: any = { params: { userId: "99" }, res: { locals } };

    await resolveDirectory(req, {}, next);

    expect(prepare).toHaveBeenCalledWith(req, locals);
    expect(next).toHaveBeenCalledWith();
    expect(req.__arkos.uploadPath).toBe(
      path.join(baseUploadDir, "users", "42", "files")
    );
    expect(statSpy).toHaveBeenCalledWith(
      path.join(baseUploadDir, "users", "42", "files")
    );
  });

  it("does not fall back to req.params when prepare omits a dir param", async () => {
    serveUploadDir("users/:userId/files", {
      urlPath: "/users/:userId/files",
      prepare: () => ({ dirParams: {} }),
    });

    const { resolveDirectory } = getStaticHandler(1);
    const next = jest.fn();

    await resolveDirectory({ params: { userId: "42" } }, {}, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toMatch(/Missing required/);
  });

  it("rejects unsafe dir params from prepare", async () => {
    serveUploadDir("users/:userId/files", {
      urlPath: "/users/:userId/files",
      prepare: () => ({ dirParams: { userId: "../admin" } }),
    });

    const { resolveDirectory } = getStaticHandler(1);
    const next = jest.fn();

    await resolveDirectory({ params: {} }, {}, next);

    expect(next.mock.calls[next.mock.calls.length - 1][0]).toMatchObject({
      statusCode: 404,
      code: "FileNotFound",
    });
  });

  it("returns 404 when the resolved directory does not exist", async () => {
    statSpy.mockRejectedValue(new Error("ENOENT"));
    serveUploadDir("storage/acme");

    const { resolveDirectory } = getStaticHandler(1);
    const next = jest.fn();

    await resolveDirectory({ params: {} }, {}, next);

    expect(next.mock.calls[next.mock.calls.length - 1][0]).toMatchObject({
      statusCode: 404,
      code: "FileNotFound",
    });
  });

  it("serves an exact file when the resolved path is a file", async () => {
    const filePath = path.join(baseUploadDir, "users", "42", "avatar");
    statSpy.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
    } as any);
    serveUploadDir("users/:userId/avatar", {
      urlPath: "/users/:userId/avatar",
      prepare: () => ({ dirParams: { userId: "42" } }),
    });

    const { resolveDirectory, serveFile } = getStaticHandler(0);
    const next = jest.fn();
    const req: any = { url: "/users/42/avatar", params: {}, res: {} };

    await resolveDirectory(req, {}, next);
    serveFile(req, {}, next);

    expect(filePath).toBe(path.join(baseUploadDir, "users", "42", "avatar"));
    expect(getArguments).toEqual([
      { root: path.dirname(filePath), url: "/avatar" },
    ]);
  });

  it("does not serve a file through the folder route", async () => {
    statSpy.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
    } as any);
    serveUploadDir("storage/acme");

    const { resolveDirectory, serveFile } = getStaticHandler(1);
    const next = jest.fn();
    const req: any = {
      url: "/storage/acme/file.png",
      params: { fileName: "file.png" },
      res: {},
    };

    await resolveDirectory(req, {}, next);
    serveFile(req, {}, next);

    expect(next.mock.calls[next.mock.calls.length - 1][0]).toMatchObject({
      statusCode: 404,
      code: "FileNotFound",
    });
  });

  it("does not serve a directory through the exact file route", async () => {
    serveUploadDir("storage/acme");

    const { resolveDirectory, serveFile } = getStaticHandler(0);
    const next = jest.fn();
    const req: any = { url: "/storage/acme", params: {}, res: {} };

    await resolveDirectory(req, {}, next);
    serveFile(req, {}, next);

    expect(next.mock.calls[next.mock.calls.length - 1][0]).toMatchObject({
      statusCode: 404,
      code: "FileNotFound",
    });
  });

  it("rejects traversing file paths before serving", () => {
    serveUploadDir("storage/acme", { recursive: true });

    const { serveFile } = getStaticHandler(1);
    const next = jest.fn();
    const req: any = {
      url: "/storage/acme/../../etc/passwd",
      params: { 0: "../../etc/passwd" },
      __arkos: {
        uploadPath: path.join(baseUploadDir, "storage/acme"),
        uploadKind: "directory",
      },
    };

    serveFile(req, {}, next);

    expect(next.mock.calls[next.mock.calls.length - 1][0]).toMatchObject({
      statusCode: 404,
      code: "FileNotFound",
    });
  });

  it("rejects nested segments when recursive is false", () => {
    serveUploadDir("storage/acme", { recursive: false });

    const { serveFile } = getStaticHandler(1);
    const next = jest.fn();
    const req: any = {
      url: "/storage/acme/a/b.png",
      params: { fileName: "a/b.png" },
      __arkos: {
        uploadPath: path.join(baseUploadDir, "storage/acme"),
        uploadKind: "directory",
      },
    };

    serveFile(req, {}, next);

    expect(next.mock.calls[next.mock.calls.length - 1][0]).toMatchObject({
      statusCode: 404,
      code: "FileNotFound",
    });
  });

  it("rewrites the request URL before delegating to express.static", () => {
    serveUploadDir("storage/acme", { recursive: true });

    const { serveFile } = getStaticHandler(1);
    const next = jest.fn();
    const req: any = {
      url: "/storage/acme/a/b.png?width=100",
      params: { 0: "a/b.png" },
      __arkos: {
        uploadPath: path.join(baseUploadDir, "storage/acme"),
        uploadKind: "directory",
      },
    };

    serveFile(req, {}, next);

    expect(getArguments).toEqual([
      {
        root: path.join(baseUploadDir, "storage/acme"),
        url: "/a/b.png?width=100",
      },
    ]);
    expect(next).toHaveBeenCalled();
  });

  it("merges express.static defaults with global and local options", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "uploads",
        expressStatic: { etag: false },
      },
    });

    serveUploadDir("storage/acme", {
      expressStatic: { index: true, fallthrough: true },
    });

    const { serveFile } = getStaticHandler(1);
    const req: any = {
      url: "/storage/acme/a.png",
      params: { fileName: "a.png" },
      __arkos: {
        uploadPath: path.join(baseUploadDir, "storage/acme"),
        uploadKind: "directory",
      },
    };

    serveFile(req, {}, jest.fn());

    expect(express.static).toHaveBeenCalledWith(
      path.join(baseUploadDir, "storage/acme"),
      expect.objectContaining({
        maxAge: "1y",
        etag: false,
        index: true,
        fallthrough: true,
      })
    );
  });

});
