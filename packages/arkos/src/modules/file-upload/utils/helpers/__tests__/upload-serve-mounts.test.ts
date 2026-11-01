import { getArkosConfig } from "../../../../../server";
import type { ArkosRouterState } from "../../../../../utils/arkos-router/types";
import {
  uploadServingRegistry,
  UploadServeSource,
} from "../upload-serving.registry";
import { resolveUploadServeSources } from "../upload-serving-validation";

jest.mock("../../../../../server", () => ({
  getArkosConfig: jest.fn(),
}));

const state = (
  mounts: ArkosRouterState["mounts"] = []
): ArkosRouterState => ({ routes: [], mounts });

const source = (router: ArkosRouterState): UploadServeSource => ({
  dir: "storage/acme",
  dirParams: [],
  recursive: false,
  dynamic: false,
  hasPrepare: false,
  router,
});

describe("resolveUploadServeSources", () => {
  beforeEach(() => {
    uploadServingRegistry.reset();
    (getArkosConfig as jest.Mock).mockReturnValue({
      fileUpload: { baseRoute: "/api/uploads" },
    });
  });

  it("builds the public path from the full mount chain under baseRoute", () => {
    const app = state();
    const fileUploadRouter = state([{ parent: app, path: "/" }]);
    const customRouter = state([
      { parent: fileUploadRouter, path: "/api/uploads/" },
    ]);
    const serveRouter = state([{ parent: customRouter, path: "/private/files" }]);

    uploadServingRegistry.registerServeSource(source(serveRouter));

    expect(resolveUploadServeSources("/api/uploads")).toEqual([
      expect.objectContaining({
        dir: "storage/acme",
        urlPath: "/private/files",
        pathParams: [],
      }),
    ]);
  });

  it("rejects a serve that is never mounted", () => {
    uploadServingRegistry.registerServeSource(source(state()));

    expect(() => resolveUploadServeSources("/api/uploads")).toThrow(
      /is not mounted/
    );
  });

  it("rejects a serve mounted outside baseRoute", () => {
    const app = state();
    const appChild = state([{ parent: app, path: "/private/files" }]);

    uploadServingRegistry.registerServeSource(source(appChild));

    expect(() => resolveUploadServeSources("/api/uploads")).toThrow(
      /outside fileUpload.baseRoute/
    );
  });
});
