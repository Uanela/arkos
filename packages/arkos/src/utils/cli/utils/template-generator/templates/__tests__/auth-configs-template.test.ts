import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { generateAuthConfigsTemplate } from "../auth-configs-template";

jest.mock("fs");
jest.mock("../../../../../helpers/fs.helpers");
const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;

describe("generateAuthConfigsTemplate", () => {
  const mockModelName = {
    pascal: "User",
    camel: "user",
    kebab: "user",
  };

  describe("TypeScript generation", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should generate basic TypeScript auth configs template", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
      });

      // Verify imports and types
      expect(result).toContain("import { AuthConfigs } from 'arkos/auth';");
      expect(result).toContain('import { authService } from "arkos/services"');
      expect(result).toContain("const userAuthConfigs: AuthConfigs = {");

      // Verify exported objects
      expect(result).toContain("export const userAuthenticationControl = {");
      expect(result).toContain("export const userAccessControl = {");

      // Verify authentication control values
      expect(result).toContain("Create: true,");
      expect(result).toContain("Update: true,");
      expect(result).toContain("Delete: true,");
      expect(result).toContain("View: true,");

      // Verify access control structure
      expect(result).toContain("Create: {");
      expect(result).toContain("roles: []");
      expect(result).toContain('name: "Create User"');
      expect(result).toContain(
        'description: "Permission to create new user records"'
      );
      expect(result).toContain("Update: {");
      expect(result).toContain('name: "Update User"');
      expect(result).toContain("Delete: {");
      expect(result).toContain('name: "Delete User"');
      expect(result).toContain("View: {");
      expect(result).toContain('name: "View User"');

      // Verify as const satisfies for TypeScript
      expect(result).toContain(
        '} as const satisfies AuthConfigs["accessControl"];'
      );

      // Verify default permission generation (helper function)
      expect(result).toContain("function createUserPermission(action: string)");
      expect(result).toContain("export const userPermissions = {");
      expect(result).toContain('canCreate: createUserPermission("Create")');
      expect(result).toContain('canUpdate: createUserPermission("Update")');
      expect(result).toContain('canDelete: createUserPermission("Delete")');
      expect(result).toContain('canView: createUserPermission("View")');

      // Verify main config structure
      expect(result).toContain(
        "authenticationControl: userAuthenticationControl,"
      );
      expect(result).toContain("accessControl: userAccessControl,");
    });

    it("should generate TypeScript with advanced flag", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
        advanced: true,
      });

      // Should NOT have helper function
      expect(result).not.toContain("function createUserPermission");

      // Should have reduce-based permissions
      expect(result).toContain(
        "export const userPermissions = Object.keys(userAccessControl).reduce("
      );
      expect(result).toContain(
        "acc[`can${key}` as UserPermissionName] = authService.permission("
      );

      // Should have type definition
      expect(result).toContain(
        "type UserPermissionName = `can${keyof typeof userAccessControl & string}`;"
      );

      // Should have Record type
      expect(result).toContain(
        "{} as Record<UserPermissionName, ReturnType<typeof authService.permission>>"
      );

      // Should NOT have the old complex type assertion
      expect(result).not.toContain(") as {");
      expect(result).not.toContain(
        "[K in keyof typeof userAccessControl as `can${K & string}`]: ReturnType<"
      );
    });

    it("should handle kebab-case model names correctly", () => {
      const result = generateAuthConfigsTemplate({
        modelName: {
          pascal: "BlogPost",
          camel: "blogPost",
          kebab: "blog-post",
        },
      });

      expect(result).toContain("blog-post");
      expect(result).toContain('name: "Create Blog Post"');
      expect(result).toContain(
        'description: "Permission to create new blog post records"'
      );
      expect(result).toContain("function createBlogPostPermission");
      expect(result).toContain(
        'authService.permission(action, "blog-post", blogPostAccessControl)'
      );
    });

    it("should generate proper variable names for different model formats", () => {
      const result = generateAuthConfigsTemplate({
        modelName: {
          pascal: "OrderItem",
          camel: "orderItem",
          kebab: "order-item",
        },
      });

      expect(result).toContain("export const orderItemAuthenticationControl");
      expect(result).toContain("export const orderItemAccessControl");
      expect(result).toContain("function createOrderItemPermission");
      expect(result).toContain("export const orderItemPermissions");
      expect(result).toContain("const orderItemAuthConfigs: AuthConfigs = {");
    });
  });

  describe("JavaScript generation", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("js");
    });

    it("should generate basic JavaScript auth configs template", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
      });

      // Should NOT have TypeScript imports and types
      expect(result).not.toContain("import { AuthConfigs }");
      expect(result).not.toContain(": AuthConfigs");
      expect(result).not.toContain("as const satisfies AuthConfigs");

      // Should have basic imports
      expect(result).toContain('import { authService } from "arkos/services"');

      // Should have correct variable declarations
      expect(result).toContain("const userAuthConfigs = {");
      expect(result).toContain("export const userAuthenticationControl = {");
      expect(result).toContain("export const userAccessControl = {");

      // Should have helper function for default mode
      expect(result).toContain("function createUserPermission(action)");
      expect(result).toContain("export const userPermissions = {");
      expect(result).toContain('canCreate: createUserPermission("Create")');

      // Should not have TypeScript type assertions
      expect(result).not.toContain(
        "as Record<UserPermissionName, ReturnType<typeof authService.permission>>"
      );
    });

    it("should generate JavaScript with advanced flag", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
        advanced: true,
      });

      // Should have reduce-based permissions
      expect(result).toContain(
        "export const userPermissions = Object.keys(userAccessControl).reduce("
      );

      // Should NOT have TypeScript type definition
      expect(result).not.toContain("type UserPermissionName");

      // Should NOT have TypeScript type assertions
      expect(result).not.toContain("as UserPermissionName");
      expect(result).not.toContain("as Record<");

      // Should have basic reduce implementation
      expect(result).toContain("acc[`can${key}`] = authService.permission(");
      expect(result).toContain("return acc;");
    });

    it("should handle special characters in model names", () => {
      const result = generateAuthConfigsTemplate({
        modelName: {
          pascal: "UserProfile",
          camel: "userProfile",
          kebab: "user-profile",
        },
      });

      expect(result).toContain('name: "Create User Profile"');
      expect(result).toContain(
        'description: "Permission to create new user profile records"'
      );
    });
  });

  describe("Error handling", () => {
    it("should throw error without model name", () => {
      expect(() => generateAuthConfigsTemplate({} as any)).toThrow(
        "Module name is required for auth config template"
      );
    });

    it("should throw error with null model name", () => {
      expect(() =>
        generateAuthConfigsTemplate({ modelName: null } as any)
      ).toThrow("Module name is required for auth config template");
    });

    it("should throw error with undefined model name", () => {
      expect(() =>
        generateAuthConfigsTemplate({ modelName: undefined } as any)
      ).toThrow("Module name is required for auth config template");
    });
  });

  describe("Advanced vs Default mode comparison", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should generate different permission structures based on advanced flag", () => {
      const defaultResult = generateAuthConfigsTemplate({
        modelName: mockModelName,
        advanced: false,
      });

      const advancedResult = generateAuthConfigsTemplate({
        modelName: mockModelName,
        advanced: true,
      });

      // Default has helper function
      expect(defaultResult).toContain("function createUserPermission");
      expect(defaultResult).not.toContain(
        "Object.keys(userAccessControl).reduce"
      );

      // Advanced has reduce
      expect(advancedResult).not.toContain("function createUserPermission");
      expect(advancedResult).toContain("Object.keys(userAccessControl).reduce");

      // Both should have same exports
      expect(defaultResult).toContain(
        "export const userAuthenticationControl = {"
      );
      expect(advancedResult).toContain(
        "export const userAuthenticationControl = {"
      );
      expect(defaultResult).toContain("export const userAccessControl = {");
      expect(advancedResult).toContain("export const userAccessControl = {");

      // Default should have individual permission keys
      expect(defaultResult).toContain("canCreate:");
      expect(defaultResult).toContain("canUpdate:");
      expect(defaultResult).toContain("canDelete:");
      expect(defaultResult).toContain("canView:");

      // Advanced should NOT have individual keys (uses reduce)
      expect(advancedResult).not.toContain("canCreate:");
      expect(advancedResult).not.toContain("canUpdate:");
      expect(advancedResult).not.toContain("canDelete:");
      expect(advancedResult).not.toContain("canView:");
    });

    it("should maintain consistent action names in both modes", () => {
      const defaultResult = generateAuthConfigsTemplate({
        modelName: mockModelName,
        advanced: false,
      });

      const advancedResult = generateAuthConfigsTemplate({
        modelName: mockModelName,
        advanced: true,
      });

      // Check that both have the same action names in accessControl
      const defaultActions = ["Create", "Update", "Delete", "View"];
      defaultActions.forEach((action) => {
        expect(defaultResult).toContain(`${action}: {`);
        expect(advancedResult).toContain(`${action}: {`);
      });

      // Check that both have the same role assignments
      expect(defaultResult).toContain("roles: []");
      expect(advancedResult).toContain("roles: []");
    });
  });

  describe("Edge cases", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should handle model names with numbers", () => {
      const result = generateAuthConfigsTemplate({
        modelName: {
          pascal: "User123",
          camel: "user123",
          kebab: "user-123",
        },
      });

      expect(result).toContain('name: "Create User 123"');
      expect(result).toContain(
        'description: "Permission to create new user 123 records"'
      );
    });

    it("should handle model names with underscores converted to kebab", () => {
      const result = generateAuthConfigsTemplate({
        modelName: {
          pascal: "UserProfile",
          camel: "userProfile",
          kebab: "user-profile",
        },
      });

      expect(result).toContain('authService.permission(action, "user-profile"');
    });

    it("should default advanced to false when not provided", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
        // advanced not specified
      });

      expect(result).toContain("function createUserPermission");
      expect(result).not.toContain("Object.keys(userAccessControl).reduce");
    });
  });

  describe("Template structure", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should export all required constants", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
      });

      expect(result).toContain("export const userAccessControl");
      expect(result).toContain("export const userPermissions");
      expect(result).toContain("export const userAuthenticationControl");
      expect(result).toContain("export default userAuthConfigs");
    });

    it("should have correct order of exports", () => {
      const result = generateAuthConfigsTemplate({
        modelName: mockModelName,
      });

      const accessControlIndex = result.indexOf(
        "export const userAccessControl"
      );
      const permissionsIndex = result.indexOf("export const userPermissions");
      const authenticationIndex = result.indexOf(
        "export const userAuthenticationControl"
      );
      const defaultExportIndex = result.indexOf("export default");

      // AccessControl should come first
      expect(accessControlIndex).toBeLessThan(permissionsIndex);
      // Permissions should come before AuthenticationControl
      expect(permissionsIndex).toBeLessThan(authenticationIndex);
      // Default export should be last
      expect(authenticationIndex).toBeLessThan(defaultExportIndex);
    });
  });
});
