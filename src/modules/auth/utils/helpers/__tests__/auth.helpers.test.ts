import { getArkosConfig } from "../../../../../server";
import { determineUsernameField } from "../auth.helpers";

jest.mock("../../../../../server", () => ({
  getArkosConfig: jest.fn(),
  close: jest.fn(),
}));

jest.mock("fs", () => ({
  default: {
    ...jest.requireActual("fs"),
    readdirSync: jest.fn(() => ["test.prisma"]),
    statSync: jest.fn(() => ({
      isFile: jest.fn(),
    })),
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

describe("determineUsernameField", () => {
  it("should use query parameter usernameField when provided", async () => {
    const testReq = {
      query: { usernameField: "email" },
    };

    expect(determineUsernameField(testReq as any)).toBe("email");
  });

  it("should use configuration value when query parameter is not provided", async () => {
    const testReq = { query: {} };

    (getArkosConfig as any).mockReturnValueOnce({
      authentication: {
        usernameField: "phoneNumber",
      },
    });

    expect(determineUsernameField(testReq as any)).toBe("phoneNumber");
  });

  it('should default to "username" when neither query nor config specify a field', async () => {
    expect(determineUsernameField({ query: {} } as any)).toBe("username");
  });
});
