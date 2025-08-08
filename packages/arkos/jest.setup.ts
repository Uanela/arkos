jest.mock("commander", () => {
  const mockCommand: any = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn(() => mockCommand),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
  };
  return {
    Command: jest.fn().mockImplementation(() => mockCommand),
  };
});

jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  const mockExpress = jest.fn(() => ({
    get: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    set: jest.fn(),
    static: jest.fn().mockReturnThis(),
  }));

  (mockExpress as any).static = jest.fn(() => mockRouter);
  (mockExpress as any).Router = jest.fn(() => mockRouter);
  (mockExpress as any).json = jest.fn(() => "express.json");

  return mockExpress;
});

// const portAndHostAllocator = jest.requireActual(
//   "./src/utils/features/port-and-host-allocator"
// );

// jest.mock("./src/utils/features/port-and-host-allocator", () => ({
//   __esModule: true,
//   ...jest.requireActual("./src/utils/features/port-and-host-allocator").default,
//   default: {
//     ...jest.requireActual("./src/utils/features/port-and-host-allocator")
//       .default,
//     getHostAndAvailablePort: (env: any, config: any) =>
//       (portAndHostAllocator as any).default.getCorrectHostAndPortToUse(
//         env,
//         config
//       ),
//   },
// }));
