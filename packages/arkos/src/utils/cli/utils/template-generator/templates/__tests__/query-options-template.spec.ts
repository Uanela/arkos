import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { generateQueryOptionsTemplate } from "../query-options-template";

jest.mock("../../../../../helpers/fs.helpers");
const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;

describe("generateQueryOptionsTemplate", () => {
  const mockModelName = {
    pascal: "User",
    camel: "user",
    kebab: "user",
  };

  it("should generate regular TypeScript query options template", () => {
    mockedGetUserFileExtension.mockReturnValue("ts");
    const result = generateQueryOptionsTemplate({
      modelName: mockModelName,
    });

    expect(result).toContain('import { Prisma } from "@prisma/client"');
    expect(result).toContain(
      "import { PrismaQueryOptions } from 'arkos/prisma'"
    );
    expect(result).toContain(": PrismaQueryOptions<Prisma.UserDelegate>");
    expect(result).toContain("findOne: {}");
    expect(result).toContain("createOne: {}");
  });

  it("should generate auth TypeScript query options template", () => {
    mockedGetUserFileExtension.mockReturnValue("ts");
    const authModelName = { pascal: "Auth", camel: "auth", kebab: "auth" };
    const result = generateQueryOptionsTemplate({
      modelName: authModelName,
    });

    expect(result).toContain(
      "import { PrismaQueryOptions } from 'arkos/prisma'"
    );
    expect(result).toContain(
      `: PrismaQueryOptions<Prisma.UserDelegate, "auth">`
    );
    expect(result).toContain("getMe: {}");
    expect(result).toContain("login: {}");
    expect(result).toContain("signup: {}");
  });

  it("should generate JavaScript query options template", () => {
    mockedGetUserFileExtension.mockReturnValue("js");
    const result = generateQueryOptionsTemplate({
      modelName: mockModelName,
    });

    expect(result).not.toContain("import prisma ");
    expect(result).not.toContain(": PrismaQueryOptions");
    expect(result).toContain("const userQueryOptions = {");
  });

  it("should throw error without model name", () => {
    expect(() => generateQueryOptionsTemplate({} as any)).toThrow(
      "Module name is required for query config template"
    );
  });
});
