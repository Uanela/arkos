// import { expect, vi } from "vitest";
// import { getInitConfigs } from "../../../../../server";
// import { describe, it } from "vitest";
// import { determineUsernameField } from "../auth.helpers";

// vi.mock("../../../../../server", () => ({
//   getInitConfigs: vi.fn(),
//   close: vi.fn(),
// }));

// vi.mock("fs", () => ({
//   default: {
//     ...vi.importActual("fs"),
//     readdirSync: vi.fn(() => ["test.prisma"]),
//     statSync: vi.fn(() => ({
//       isFile: vi.fn(),
//     })),
//     existsSync: vi.fn(() => false),
//     mkdirSync: vi.fn(),
//     unlink: vi.fn(),
//     access: vi.fn(),
//   },
// }));

// describe("determineUsernameField", () => {
//   it("should use query parameter usernameField when provided", async () => {
//     const testReq = {
//       query: { usernameField: "email" },
//     };

//     expect(determineUsernameField(testReq as any)).toBe("email");
//   });

//   it("should use configuration value when query parameter is not provided", async () => {
//     const testReq = { query: {} };

//     (getInitConfigs as any).mockReturnValueOnce({
//       authentication: {
//         usernameField: "phoneNumber",
//       },
//     });

//     expect(determineUsernameField(testReq as any)).toBe("phoneNumber");
//   });

//   it('should default to "username" when neither query nor config specify a field', async () => {
//     expect(determineUsernameField({ query: {} } as any)).toBe("username");
//   });
// });
