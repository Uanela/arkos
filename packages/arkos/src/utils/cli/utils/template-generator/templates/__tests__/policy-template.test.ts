import { generatePolicyTemplate } from "../policy-template";

jest.mock("../../../../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    getModelsAsArrayOfStrings: jest.fn(),
  },
}));

import prismaSchemaParser from "../../../../../prisma/prisma-schema-parser";

const mockGetModels = prismaSchemaParser.getModelsAsArrayOfStrings as jest.Mock;

const userModelName = {
  kebab: "user",
  camel: "user",
  pascal: "User",
  snake: "user",
};

const blogPostModelName = {
  kebab: "blog-post",
  camel: "blogPost",
  pascal: "BlogPost",
  snake: "blog_post",
};

const nonModelName = {
  kebab: "custom-service",
  camel: "customService",
  pascal: "CustomService",
  snake: "custom_service",
};

describe("generatePolicyTemplate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetModels.mockReturnValue(["user", "blog-post", "order"]);
  });

  describe("validation", () => {
    it("should throw if modelName is not provided", () => {
      expect(() => generatePolicyTemplate({} as any)).toThrow(
        "Module name is required for policy template"
      );
    });

    it("should throw if modelName is null", () => {
      expect(() => generatePolicyTemplate({ modelName: null } as any)).toThrow(
        "Module name is required for policy template"
      );
    });
  });

  describe("imports and structure", () => {
    it("should always import ArkosPolicy from arkos", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`import { ArkosPolicy } from "arkos";`);
    });

    it("should export default the policy", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`export default userPolicy;`);
    });

    it("should create policy with correct resource name", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`ArkosPolicy("user")`);
    });

    it("should use camelCase for variable name", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: blogPostModelName });
      expect(result).toContain(
        `const blogPostPolicy = ArkosPolicy("blog-post")`
      );
    });
  });

  describe("prisma model detection", () => {
    it("should include crud rules when module is a prisma model", () => {
      mockGetModels.mockReturnValue(["user"]);
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`.rule("Create"`);
      expect(result).toContain(`.rule("View"`);
      expect(result).toContain(`.rule("Update"`);
      expect(result).toContain(`.rule("Delete"`);
    });

    it("should not include crud rules when module is not a prisma model", () => {
      mockGetModels.mockReturnValue(["user", "order"]);
      const result = generatePolicyTemplate({ modelName: nonModelName });
      expect(result).not.toContain(`.rule("Create"`);
      expect(result).not.toContain(`.rule("View"`);
      expect(result).not.toContain(`.rule("Update"`);
      expect(result).not.toContain(`.rule("Delete"`);
    });

    it("should handle empty models array", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).not.toContain(`.rule(`);
    });

    it("should match blog-post model correctly", () => {
      mockGetModels.mockReturnValue(["blog-post"]);
      const result = generatePolicyTemplate({ modelName: blogPostModelName });
      expect(result).toContain(`.rule("Create"`);
    });
  });

  describe("crud rules content", () => {
    beforeEach(() => {
      mockGetModels.mockReturnValue(["user"]);
    });

    it("should generate correct Create rule", () => {
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`name: "Create User"`);
      expect(result).toContain(
        `description: "Permission to create new user records"`
      );
    });

    it("should generate correct View rule", () => {
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`name: "View User"`);
      expect(result).toContain(
        `description: "Permission to view user records"`
      );
    });

    it("should generate correct Update rule", () => {
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`name: "Update User"`);
      expect(result).toContain(
        `description: "Permission to update existing user records"`
      );
    });

    it("should generate correct Delete rule", () => {
      const result = generatePolicyTemplate({ modelName: userModelName });
      expect(result).toContain(`name: "Delete User"`);
      expect(result).toContain(
        `description: "Permission to delete user records"`
      );
    });

    it("should initialize all rules with empty roles array", () => {
      const result = generatePolicyTemplate({ modelName: userModelName });
      const rolesMatches = result.match(/roles: \[\]/g);
      expect(rolesMatches).toHaveLength(4);
    });
  });

  describe("multi-word model names", () => {
    beforeEach(() => {
      mockGetModels.mockReturnValue(["blog-post"]);
    });

    it("should capitalize multi-word kebab model name correctly", () => {
      const result = generatePolicyTemplate({ modelName: blogPostModelName });
      expect(result).toContain(`name: "Create Blog Post"`);
    });

    it("should use spaced name in descriptions", () => {
      const result = generatePolicyTemplate({ modelName: blogPostModelName });
      expect(result).toContain(`blog post records`);
    });

    it("should use correct resource name", () => {
      const result = generatePolicyTemplate({ modelName: blogPostModelName });
      expect(result).toContain(`ArkosPolicy("blog-post")`);
    });

    it("should use camelCase variable name", () => {
      const result = generatePolicyTemplate({ modelName: blogPostModelName });
      expect(result).toContain(`export default blogPostPolicy;`);
    });
  });

  describe("non-model output", () => {
    it("should generate valid policy without rules for non-model", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: nonModelName });
      expect(result).toContain(
        `const customServicePolicy = ArkosPolicy("custom-service");`
      );
      expect(result).toContain(`export default customServicePolicy;`);
    });

    it("should not have trailing rules for non-model", () => {
      mockGetModels.mockReturnValue([]);
      const result = generatePolicyTemplate({ modelName: nonModelName });
      expect(result).not.toContain(`.rule(`);
    });
  });
});
