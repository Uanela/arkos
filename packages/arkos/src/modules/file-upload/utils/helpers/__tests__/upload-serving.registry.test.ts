import {
  uploadServingRegistry,
  UploadServeRegistration,
} from "../upload-serving.registry";

describe("upload-serving registry", () => {
  beforeEach(() => uploadServingRegistry.reset());

  it("registers write configurations", () => {
    uploadServingRegistry.registerWrite({
      dir: "storage/acme",
      urlPath: "/private/files",
      serve: false,
      route: "/documents/:id/files",
    });

    expect(uploadServingRegistry.getWriteRegistrations()).toEqual([
      {
        dir: "storage/acme",
        urlPath: "/private/files",
        serve: false,
        route: "/documents/:id/files",
      },
    ]);
  });

  it("registers serve configurations", () => {
    const registration: UploadServeRegistration = {
      dir: "storage/acme",
      urlPath: "/private/files",
      dirParams: [],
      pathParams: [],
      recursive: true,
      dynamic: false,
      hasPrepare: false,
    };

    uploadServingRegistry.registerServe(registration);

    expect(uploadServingRegistry.getServeRegistrations()).toEqual([
      registration,
    ]);
  });

  it("tracks whether findFile is mounted", () => {
    expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(false);

    uploadServingRegistry.setFindFileServingEnabled(true);
    expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(true);

    uploadServingRegistry.setFindFileServingEnabled(false);
    expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(false);
  });

  it("resets every registry entry", () => {
    uploadServingRegistry.registerWrite({ route: "/" });
    uploadServingRegistry.registerServe({
      dir: "storage/acme",
      urlPath: "/private/files",
      dirParams: [],
      pathParams: [],
      recursive: true,
      dynamic: false,
      hasPrepare: false,
    });
    uploadServingRegistry.setFindFileServingEnabled(true);

    uploadServingRegistry.reset();

    expect(uploadServingRegistry.getWriteRegistrations()).toEqual([]);
    expect(uploadServingRegistry.getServeRegistrations()).toEqual([]);
    expect(uploadServingRegistry.isFindFileServingEnabled()).toBe(false);
  });
});
