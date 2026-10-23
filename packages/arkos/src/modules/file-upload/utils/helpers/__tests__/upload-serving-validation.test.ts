import { getArkosConfig } from "../../../../../server";
import {
  uploadServingRegistry,
  UploadServeRegistration,
} from "../upload-serving.registry";
import { validateUploadServingConfig } from "../upload-serving-validation";

jest.mock("../../../../../server", () => ({
  getArkosConfig: jest.fn(),
}));

const serveRegistration = (
  overrides: Partial<UploadServeRegistration> = {}
): UploadServeRegistration => ({
  dir: "storage/acme",
  urlPath: "/private/files",
  dirParams: [],
  pathParams: [],
  recursive: true,
  dynamic: false,
  hasPrepare: false,
  ...overrides,
});

describe("validateUploadServingConfig", () => {
  beforeEach(() => {
    uploadServingRegistry.reset();
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "uploads",
        serving: "registered",
      },
    });
    jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("throws when the automatic URL differs from the served path", () => {
    uploadServingRegistry.registerWrite({ dir: "storage/acme", route: "/documents" });
    uploadServingRegistry.registerServe(serveRegistration());

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("passes when a custom URL path matches the served path", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/acme",
      urlPath: "/private/files",
      route: "/documents",
    });
    uploadServingRegistry.registerServe(serveRegistration());

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("throws when a custom write directory is not served", () => {
    uploadServingRegistry.registerWrite({ dir: "storage/other", route: "/documents" });

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("skips directories marked with serve: false", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/other",
      serve: false,
      route: "/documents",
    });

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("throws when the write URL does not match the served URL", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/acme",
      urlPath: "/documents/files",
      route: "/documents",
    });
    uploadServingRegistry.registerServe(serveRegistration());

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("skips built-in upload directories while findFile is enabled", () => {
    uploadServingRegistry.setFindFileServingEnabled(true);
    uploadServingRegistry.registerWrite({ dir: "images", route: "/documents" });

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("requires built-in directories to be served when findFile is disabled", () => {
    uploadServingRegistry.registerWrite({ dir: "images", route: "/documents" });

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("accepts a built-in directory registered with serveUploadDir when findFile is disabled", () => {
    uploadServingRegistry.registerServe(
      serveRegistration({
        dir: "images",
        urlPath: "/images",
      })
    );
    uploadServingRegistry.registerWrite({ dir: "images", route: "/documents" });

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("validates dynamic directories against dynamic serve paths", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/acme/files",
      urlPath: "/tenants/acme/files",
      route: "/tenants/:tenantId/files",
    });
    uploadServingRegistry.registerServe(
      serveRegistration({
        dir: "storage/:tenantId/files",
        urlPath: "/tenants/:tenantId/files",
        dirParams: ["tenantId"],
        pathParams: ["tenantId"],
        dynamic: true,
        hasPrepare: true,
      })
    );

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("throws when a dynamic write URL does not match the substitution", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/acme/files",
      urlPath: "/tenants/other/files",
      route: "/tenants/:tenantId/files",
    });
    uploadServingRegistry.registerServe(
      serveRegistration({
        dir: "storage/:tenantId/files",
        urlPath: "/tenants/:tenantId/files",
        dirParams: ["tenantId"],
        pathParams: ["tenantId"],
        dynamic: true,
        hasPrepare: true,
      })
    );

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("keeps param placeholders when the write dir shares the serve template", () => {
    uploadServingRegistry.registerWrite({
      dir: "conversations/:conversationId/images",
      route: "/conversations/:conversationId",
      hasPrepare: true,
    });
    uploadServingRegistry.registerServe(
      serveRegistration({
        dir: "conversations/:conversationId",
        urlPath: "/conversations/:conversationId",
        dirParams: ["conversationId"],
        pathParams: ["conversationId"],
        dynamic: true,
        hasPrepare: true,
      })
    );

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("throws on duplicate serving paths", () => {
    uploadServingRegistry.registerServe(serveRegistration());
    uploadServingRegistry.registerServe(serveRegistration({ dir: "storage/other" }));

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("throws when the same directory is served at multiple paths", () => {
    uploadServingRegistry.registerServe(serveRegistration());
    uploadServingRegistry.registerServe(serveRegistration({ urlPath: "/other/files" }));

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("throws when serving a built-in upload root while findFile is enabled", () => {
    uploadServingRegistry.setFindFileServingEnabled(true);
    uploadServingRegistry.registerServe(
      serveRegistration({ dir: "images/private", urlPath: "/private/images" })
    );

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("allows built-in roots when findFile is disabled", () => {
    uploadServingRegistry.registerServe(
      serveRegistration({ dir: "images/private", urlPath: "/private/images" })
    );

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("requires uploadDir when urlPath is declared", () => {
    uploadServingRegistry.registerWrite({ urlPath: "/private/files", route: "/documents" });

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("rejects urlPaths that include the baseRoute", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/acme",
      urlPath: "/api/uploads/private/files",
      route: "/documents",
    });
    uploadServingRegistry.registerServe(serveRegistration());

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("does not enforce coverage in all mode", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "uploads",
        serving: "all",
      },
    });
    uploadServingRegistry.registerWrite({ dir: "storage/other", route: "/documents" });
    uploadServingRegistry.registerServe(serveRegistration());

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("does not warn in all mode when no serve directories are registered", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "uploads",
        serving: "all",
      },
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    uploadServingRegistry.registerWrite({ dir: "storage/other", route: "/documents" });

    validateUploadServingConfig();

    expect(warn).not.toHaveBeenCalled();
  });

  it("throws when a dynamic serve registration has no prepare", () => {
    uploadServingRegistry.registerServe(
      serveRegistration({
        dir: "storage/:tenantId/files",
        urlPath: "/tenants/:tenantId/files",
        dirParams: ["tenantId"],
        pathParams: ["tenantId"],
        dynamic: true,
        hasPrepare: false,
      })
    );

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("throws when a dynamic write directory has no prepare", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/:tenantId/files",
      serve: false,
      route: "/tenants/:tenantId/files",
    });

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("allows a dynamic write directory with prepare", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/:tenantId/files",
      serve: false,
      hasPrepare: true,
      route: "/tenants/:tenantId/files",
    });

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("warns about unused URL params on writes", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    uploadServingRegistry.registerWrite({
      dir: "storage/acme",
      urlPath: "/tenants/:tenantId/files",
      serve: false,
      route: "/tenants/:tenantId/files",
    });

    validateUploadServingConfig();

    expect(warn).toHaveBeenCalled();
  });

  it("suppresses unused URL param warnings through config", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: {
        baseRoute: "/api/uploads",
        baseUploadDir: "uploads",
        serving: "registered",
      },
      warnings: { fileUpload: { suppressUnusedUrlParams: true } },
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    uploadServingRegistry.registerWrite({
      dir: "storage/acme",
      urlPath: "/tenants/:tenantId/files",
      serve: false,
      route: "/tenants/:tenantId/files",
    });

    validateUploadServingConfig();

    expect(warn).not.toHaveBeenCalled();
  });

  it("does not require coverage for exact write URLs", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/avatars",
      urlPath: { exact: "/users/me/photo" },
      route: "/users/me/photo",
      type: "single",
    });

    expect(() => validateUploadServingConfig()).not.toThrow();
  });

  it("throws when an exact write URL is used twice", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/avatars",
      urlPath: { exact: "/users/me/photo" },
      route: "/users/me/photo",
      type: "single",
    });
    uploadServingRegistry.registerWrite({
      dir: "storage/covers",
      urlPath: { exact: "/users/me/photo" },
      route: "/users/me/cover",
      type: "single",
    });

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("throws when an exact write URL is used with an array upload", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/avatars",
      urlPath: { exact: "/users/me/photos" },
      route: "/users/me/photos",
      type: "array",
    });

    expect(() => validateUploadServingConfig()).toThrow();
  });

  it("rejects dynamic exact write URLs", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/avatars",
      urlPath: { exact: "/users/:userId/photo" },
      route: "/users/:userId/photo",
      type: "single",
    });

    expect(() => validateUploadServingConfig()).toThrow();
  });
});
