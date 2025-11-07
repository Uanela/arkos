import { generateControllerTemplate } from "../generate-controller-template";

describe("generateControllerTemplate", () => {
  const baseOptions = {
    modelName: {
      camel: "test",
      pascal: "Test",
      kebab: "test",
    },
    imports: {},
  };

  it("should throw error when modelName is not provided", () => {
    expect(() => generateControllerTemplate({} as any)).toThrow(
      "Module name is required for controller template"
    );
  });

  it("should generate base controller template for generic model", () => {
    const result = generateControllerTemplate(baseOptions);

    expect(result).toContain(
      'import { BaseController } from "arkos/controllers";'
    );
    expect(result).toContain("class TestController extends BaseController {}");
    expect(result).toContain(
      'const testController = new TestController("test");'
    );
    expect(result).toContain("export default testController;");
  });

  it("should generate file upload controller template", () => {
    const options = {
      ...baseOptions,
      modelName: {
        camel: "fileUpload",
        pascal: "FileUpload",
        kebab: "file-upload",
      },
    };

    const result = generateControllerTemplate(options);

    expect(result).toContain(
      'import { FileUploadController } from "arkos/controllers";'
    );
    expect(result).toContain(
      "class FileUploadController extends FileUploadController {}"
    );
    expect(result).toContain(
      "const fileUploadController = new FileUploadController();"
    );
  });

  it("should generate auth controller template without model name parameter", () => {
    const options = {
      ...baseOptions,
      modelName: {
        camel: "auth",
        pascal: "Auth",
        kebab: "auth",
      },
    };

    const result = generateControllerTemplate(options);

    expect(result).not.toContain("import {");
    expect(result).toContain("class AuthController {}");
    expect(result).toContain("const authController = new AuthController();");
    expect(result).toContain("export default authController;");
  });

  it("should generate email controller template without model name parameter", () => {
    const options = {
      ...baseOptions,
      modelName: {
        camel: "email",
        pascal: "Email",
        kebab: "email",
      },
    };

    const result = generateControllerTemplate(options);

    expect(result).not.toContain("import {");
    expect(result).toContain("class EmailController {}");
    expect(result).toContain("const emailController = new EmailController();");
  });

  it("should use custom imports when provided", () => {
    const options = {
      ...baseOptions,
      imports: {
        baseController: "custom/controllers",
      },
    };

    const result = generateControllerTemplate(options);

    expect(result).toContain(
      'import { BaseController } from "custom/controllers";'
    );
  });

  it("should use custom file upload import when provided", () => {
    const options = {
      modelName: {
        camel: "fileUpload",
        pascal: "FileUpload",
        kebab: "file-upload",
      },
      imports: {
        fileUploadController: "custom/file-controllers",
      },
    };

    const result = generateControllerTemplate(options);

    expect(result).toContain(
      'import { FileUploadController } from "custom/file-controllers";'
    );
  });

  it("should handle different model name cases correctly", () => {
    const options = {
      modelName: {
        camel: "userProfile",
        pascal: "UserProfile",
        kebab: "user-profile",
      },
      imports: {},
    };

    const result = generateControllerTemplate(options);

    expect(result).toContain(
      "class UserProfileController extends BaseController {}"
    );
    expect(result).toContain(
      'const userProfileController = new UserProfileController("user-profile");'
    );
  });
});
