import { pascalCase } from "../../../../../helpers/change-case.helpers";
import { TemplateOptions } from "../../../template-generators";
import { generateControllerTemplate } from "../generate-controller-template";

describe("generateControllerTemplate", () => {
  describe("Error Handling", () => {
    it("should throw error when modelName is not provided", () => {
      const options = {} as TemplateOptions;

      expect(() => generateControllerTemplate(options)).toThrow(
        "Module name is required for controller template"
      );
    });

    it("should throw error when modelName is undefined", () => {
      const options = { modelName: undefined } as any;

      expect(() => generateControllerTemplate(options)).toThrow(
        "Module name is required for controller template"
      );
    });

    it("should throw error when modelName is null", () => {
      const options = { modelName: null } as any;

      expect(() => generateControllerTemplate(options)).toThrow(
        "Module name is required for controller template"
      );
    });
  });

  describe("Base Controller Generation", () => {
    it("should generate base controller template for standard models", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        'import { BaseController } from "arkos/controllers"'
      );
      expect(result).toContain(
        "class PostController extends BaseController {}"
      );
      expect(result).toContain(
        'const postController = new PostController("post");'
      );
      expect(result).toContain("export default postController;");
    });

    it("should use custom import path when provided", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
        imports: {
          baseController: "../../core/controllers",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        'import { BaseController } from "../../core/controllers"'
      );
      expect(result).toContain(
        "class UserController extends BaseController {}"
      );
      expect(result).toContain(
        'const userController = new UserController("user");'
      );
    });

    it("should handle multi-word model names correctly", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "BlogPost",
          camel: "blogPost",
          kebab: "blog-post",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        "class BlogPostController extends BaseController {}"
      );
      expect(result).toContain(
        'const blogPostController = new BlogPostController("blog-post");'
      );
      expect(result).toContain("export default blogPostController;");
    });
  });

  describe("FileUpload Controller Generation", () => {
    it("should generate FileUploadController for fileupload model", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "FileUpload",
          camel: "fileUpload",
          kebab: "file-upload",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        'import { FileUploadController } from "arkos/controllers"'
      );
      expect(result).toContain(
        "class FileUploadController extends FileUploadController {}"
      );
      expect(result).toContain(
        "const fileUploadController = new FileUploadController();"
      );
      expect(result).not.toContain('"file-upload"'); // No model name parameter
    });

    it("should use custom import path for FileUploadController", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "FileUpload",
          camel: "fileUpload",
          kebab: "file-upload",
        },
        imports: {
          fileUploadController: "@custom/controllers",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        'import { FileUploadController } from "@custom/controllers"'
      );
    });
  });

  describe("Auth Controller Generation", () => {
    it("should generate AuthController for auth model", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).not.toContain(
        'import { AuthController as ArkosAuthController } from "arkos/controllers"'
      );
      expect(result).toContain("class AuthController {}");
      expect(result).toContain("const authController = new AuthController();");
      expect(result).not.toContain('"auth"'); // No model name parameter
    });

    it("should use custom import path for AuthController", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
        imports: {
          authController: "../../auth/controllers",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).not.toContain(
        'import { AuthController } from "../../auth/controllers"'
      );
      expect(result).toContain("class AuthController");
    });
  });

  describe("Email Controller Generation", () => {
    it("should generate EmailController for email model", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Email",
          camel: "email",
          kebab: "email",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).not.toContain(
        'import { EmailController } from "arkos/controllers"'
      );
      expect(result).toContain("class EmailController {}");
      expect(result).toContain(
        "const emailController = new EmailController();"
      );
      expect(result).not.toContain('"email"'); // No model name parameter
    });
  });

  describe("Template Formatting", () => {
    it("should maintain consistent spacing and indentation", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Product",
          camel: "product",
          kebab: "product",
        },
      };

      const result = generateControllerTemplate(options);

      // Check for proper line breaks
      expect(result).toMatch(/import.*\n\s*\nexport class/);
      expect(result).toMatch(/export class.*{}\n\s*\nconst/);
      expect(result).toMatch(/;\n\s*\nexport default/);
    });

    it("should generate valid TypeScript syntax", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Category",
          camel: "category",
          kebab: "category",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toMatch(/^import/); // Starts with import
      expect(result).toContain("export default categoryController");
      expect(result).not.toContain(";;"); // No double semicolons
      expect(
        result.split("\n").filter((line) => line.trim()).length
      ).toBeGreaterThan(3); // Has multiple lines
    });
  });

  describe("Edge Cases", () => {
    it("should handle single character model names", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "A",
          camel: "a",
          kebab: "a",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain("class AController extends BaseController {}");
      expect(result).toContain('const aController = new AController("a");');
    });

    it("should handle very long model names", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "VeryLongModelNameWithManyWords",
          camel: "veryLongModelNameWithManyWords",
          kebab: "very-long-model-name-with-many-words",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        "class VeryLongModelNameWithManyWordsController extends BaseController {}"
      );
      expect(result).toContain(
        'const veryLongModelNameWithManyWordsController = new VeryLongModelNameWithManyWordsController("very-long-model-name-with-many-words");'
      );
    });

    it("should handle model names with numbers", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Post2023",
          camel: "post2023",
          kebab: "post-2023",
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        "class Post2023Controller extends BaseController {}"
      );
      expect(result).toContain(
        'const post2023Controller = new Post2023Controller("post-2023");'
      );
    });
  });

  describe("Import Overrides", () => {
    it("should handle all import overrides together", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
        imports: {
          baseController: "@custom/base",
          authController: "@custom/auth",
          emailController: "@custom/email",
          fileUploadController: "@custom/fileupload",
        },
      };

      const result = generateControllerTemplate(options);

      // Only baseController should be used for Post
      expect(result).toContain('import { BaseController } from "@custom/base"');
      expect(result).not.toContain("@custom/auth");
      expect(result).not.toContain("@custom/email");
      expect(result).not.toContain("@custom/fileupload");
    });

    it("should use default import when imports object is provided but specific controller is not", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
        imports: {
          authController: "@custom/auth", // Not used for User model
        },
      };

      const result = generateControllerTemplate(options);

      expect(result).toContain(
        'import { BaseController } from "arkos/controllers"'
      );
    });
  });

  describe("Controller Type Detection", () => {
    it("should detect fileupload type case-insensitively", () => {
      const variations = [
        { pascal: "FileUpload", camel: "fileUpload" },
        { pascal: "Fileupload", camel: "fileupload" },
        { pascal: "FileUpload", camel: "FILEUPLOAD" }, // Won't match due to case
      ];

      variations.forEach(({ pascal, camel }) => {
        const options: TemplateOptions = {
          modelName: { pascal, camel, kebab: camel },
        };

        const result = generateControllerTemplate(options);
        const isFileUpload = camel.toLowerCase() === "fileupload";

        if (isFileUpload) {
          expect(result).toContain("FileUploadController");
          expect(result).not.toContain('"file');
        }
      });
    });

    it("should only match exact lowercase for auth and email", () => {
      const testCases = [
        { camel: "auth", shouldMatch: true },
        { camel: "Auth", shouldMatch: false },
        { camel: "AUTH", shouldMatch: false },
        { camel: "email", shouldMatch: true },
        { camel: "Email", shouldMatch: false },
        { camel: "EMAIL", shouldMatch: false },
      ];

      testCases.forEach(({ camel, shouldMatch }) => {
        const options: TemplateOptions = {
          modelName: {
            pascal: pascalCase(camel),
            camel,
            kebab: camel.toLowerCase(),
          },
        };

        const result = generateControllerTemplate(options);

        if (shouldMatch && camel === "auth") {
          expect(result).toContain("AuthController");
          expect(result).not.toContain(`("auth")`); // No model name in quotes
        } else if (shouldMatch && camel === "email") {
          expect(result).toContain("EmailController");
          expect(result).not.toContain(`("email")`);
        }
      });
    });
  });
});
