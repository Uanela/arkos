import { generateServiceTemplate } from "../service-template";
import { TemplateOptions } from "../../../template-generators";
import * as fsHelpers from "../../../../../helpers/fs.helpers";

jest.mock("../../../../../helpers/fs.helpers");

describe("generateServiceTemplate", () => {
  const mockGetUserFileExtension =
    fsHelpers.getUserFileExtension as jest.MockedFunction<
      typeof fsHelpers.getUserFileExtension
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Error Handling", () => {
    it("should throw error when modelName is not provided", () => {
      const options = {} as TemplateOptions;

      expect(() => generateServiceTemplate(options)).toThrow(
        "Module name is required for service template"
      );
    });

    it("should throw error when modelName is undefined", () => {
      const options = { modelName: undefined } as any;

      expect(() => generateServiceTemplate(options)).toThrow(
        "Module name is required for service template"
      );
    });

    it("should throw error when modelName is null", () => {
      const options = { modelName: null } as any;

      expect(() => generateServiceTemplate(options)).toThrow(
        "Module name is required for service template"
      );
    });
  });

  describe("Base Service Generation - TypeScript", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should generate base service template with type parameter for standard models", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('import { BaseService } from "arkos/services"');
      expect(result).toContain(
        'class PostService extends BaseService<"post"> {}'
      );
      expect(result).toContain('const postService = new PostService("post");');
      expect(result).toContain("export default postService;");
    });

    it("should use custom import path when provided", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
        imports: {
          baseService: "../../core/services",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { BaseService } from "../../core/services"'
      );
      expect(result).toContain(
        'class UserService extends BaseService<"user"> {}'
      );
      expect(result).toContain('const userService = new UserService("user");');
    });

    it("should handle multi-word model names correctly", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "BlogPost",
          camel: "blogPost",
          kebab: "blog-post",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'class BlogPostService extends BaseService<"blog-post"> {}'
      );
      expect(result).toContain(
        'const blogPostService = new BlogPostService("blog-post");'
      );
      expect(result).toContain("export default blogPostService;");
    });
  });

  describe("Base Service Generation - JavaScript", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("js");
    });

    it("should generate base service template without type parameter for JS", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('import { BaseService } from "arkos/services"');
      expect(result).toContain("class PostService extends BaseService {}");
      expect(result).not.toContain('<"post">');
      expect(result).toContain('const postService = new PostService("post");');
      expect(result).toContain("export default postService;");
    });

    it("should use custom import path when provided in JS", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Category",
          camel: "category",
          kebab: "category",
        },
        imports: {
          baseService: "@lib/services",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('import { BaseService } from "@lib/services"');
      expect(result).toContain("class CategoryService extends BaseService {}");
      expect(result).not.toContain("<");
    });
  });

  describe("FileUpload Service Generation", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should generate FileUploadService for fileUpload model", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "FileUpload",
          camel: "fileUpload",
          kebab: "file-upload",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { FileUploadService as ArkosFileUploadService } from "arkos/services"'
      );
      expect(result).toContain(
        "class FileUploadService extends ArkosFileUploadService {}"
      );
      expect(result).toContain(
        `const fileUploadService = new FileUploadService("/uploads", 10 * 1024 * 1024, /.*/, 10);`
      );
      expect(result).not.toContain('"file-upload"');
      expect(result).not.toContain("<");
    });

    it("should not include type parameter for FileUploadService in TypeScript", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "FileUpload",
          camel: "fileUpload",
          kebab: "file-upload",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).not.toContain('<"file-upload">');
      expect(result).toContain(
        "class FileUploadService extends ArkosFileUploadService {}"
      );
    });

    it("should use custom import path for FileUploadService", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "FileUpload",
          camel: "fileUpload",
          kebab: "file-upload",
        },
        imports: {
          fileUploadService: "@custom/services",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { FileUploadService as ArkosFileUploadService } from "@custom/services"'
      );
    });
  });

  describe("Auth Service Generation", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should generate AuthService for auth model", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { AuthService as ArkosAuthService } from "arkos/services"'
      );
      expect(result).toContain("class AuthService extends ArkosAuthService {}");
      expect(result).toContain("const authService = new AuthService();");
      expect(result).not.toContain('"auth"');
      expect(result).not.toContain("<");
    });

    it("should not include type parameter for AuthService in TypeScript", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).not.toContain('<"auth">');
    });

    it("should use custom import path for AuthService", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
        imports: {
          authService: "../../auth/services",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { AuthService as ArkosAuthService } from "../../auth/services"'
      );
    });
  });

  describe("Email Service Generation", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should generate EmailService for email model", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Email",
          camel: "email",
          kebab: "email",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { EmailService as ArkosEmailService } from "arkos/services"'
      );
      expect(result).toContain(
        "class EmailService extends ArkosEmailService {}"
      );
      expect(result).toContain("const emailService = new EmailService();");
      expect(result).not.toContain('"email"');
      expect(result).not.toContain("<");
    });

    it("should not include type parameter for EmailService in TypeScript", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Email",
          camel: "email",
          kebab: "email",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).not.toContain('<"email">');
    });

    it("should use custom import path for EmailService", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Email",
          camel: "email",
          kebab: "email",
        },
        imports: {
          emailService: "@lib/email",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'import { EmailService as ArkosEmailService } from "@lib/email"'
      );
    });
  });

  describe("Template Formatting", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should maintain consistent spacing and indentation", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Product",
          camel: "product",
          kebab: "product",
        },
      };

      const result = generateServiceTemplate(options);

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

      const result = generateServiceTemplate(options);

      expect(result).toMatch(/^import/);
      expect(result).toContain("export default categoryService");
      expect(result).not.toContain(";;");
      expect(
        result.split("\n").filter((line) => line.trim()).length
      ).toBeGreaterThan(3);
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should handle single character model names", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "A",
          camel: "a",
          kebab: "a",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('class AService extends BaseService<"a"> {}');
      expect(result).toContain('const aService = new AService("a");');
    });

    it("should handle very long model names", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "VeryLongModelNameWithManyWords",
          camel: "veryLongModelNameWithManyWords",
          kebab: "very-long-model-name-with-many-words",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'class VeryLongModelNameWithManyWordsService extends BaseService<"very-long-model-name-with-many-words"> {}'
      );
      expect(result).toContain(
        'const veryLongModelNameWithManyWordsService = new VeryLongModelNameWithManyWordsService("very-long-model-name-with-many-words");'
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

      const result = generateServiceTemplate(options);

      expect(result).toContain(
        'class Post2023Service extends BaseService<"post-2023"> {}'
      );
      expect(result).toContain(
        'const post2023Service = new Post2023Service("post-2023");'
      );
    });
  });

  describe("Import Overrides", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should handle all import overrides together", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
        imports: {
          baseService: "@custom/base",
          authService: "@custom/auth",
          emailService: "@custom/email",
          fileUploadService: "@custom/fileupload",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('import { BaseService } from "@custom/base"');
      expect(result).not.toContain("@custom/auth");
      expect(result).not.toContain("@custom/email");
      expect(result).not.toContain("@custom/fileupload");
    });

    it("should use default import when imports object is provided but specific service is not", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
        imports: {
          authService: "@custom/auth",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('import { BaseService } from "arkos/services"');
    });
  });

  describe("Service Type Detection", () => {
    beforeEach(() => {
      mockGetUserFileExtension.mockReturnValue("ts");
    });

    it("should correctly detect FileUpload service (case-insensitive camel check)", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "FileUpload",
          camel: "fileUpload",
          kebab: "file-upload",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain("FileUploadService");
      expect(result).toContain(
        `new FileUploadService("/uploads", 10 * 1024 * 1024, /.*/, 10)`
      );
      expect(result).not.toContain('"file-upload"');
      expect(result).not.toContain("<");
    });

    it("should correctly detect Auth service (exact lowercase match)", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain("AuthService");
      expect(result).toContain("new AuthService()");
      expect(result).not.toContain('"auth"');
      expect(result).not.toContain("<");
    });

    it("should correctly detect Email service (exact lowercase match)", () => {
      const options: TemplateOptions = {
        modelName: {
          pascal: "Email",
          camel: "email",
          kebab: "email",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain("EmailService");
      expect(result).toContain("new EmailService()");
      expect(result).not.toContain('"email"');
      expect(result).not.toContain("<");
    });

    it("should use BaseService for all other models", () => {
      const testCases = [
        { pascal: "User", camel: "user", kebab: "user" },
        { pascal: "Post", camel: "post", kebab: "post" },
        { pascal: "Category", camel: "category", kebab: "category" },
        { pascal: "BlogPost", camel: "blogPost", kebab: "blog-post" },
      ];

      testCases.forEach(({ pascal, camel, kebab }) => {
        const options: TemplateOptions = {
          modelName: { pascal, camel, kebab },
        };

        const result = generateServiceTemplate(options);

        expect(result).toContain("BaseService");
        expect(result).toContain(`new ${pascal}Service("${kebab}")`);
        expect(result).toContain(`<"${kebab}">`);
      });
    });
  });

  describe("TypeScript vs JavaScript Type Parameters", () => {
    it("should include type parameter for base service in TypeScript", () => {
      mockGetUserFileExtension.mockReturnValue("ts");

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain('extends BaseService<"post">');
    });

    it("should not include type parameter for base service in JavaScript", () => {
      mockGetUserFileExtension.mockReturnValue("js");

      const options: TemplateOptions = {
        modelName: {
          pascal: "Post",
          camel: "post",
          kebab: "post",
        },
      };

      const result = generateServiceTemplate(options);

      expect(result).toContain("extends BaseService {}");
      expect(result).not.toContain("<");
    });

    it("should never include type parameter for special services even in TypeScript", () => {
      mockGetUserFileExtension.mockReturnValue("ts");

      const specialServices = [
        { pascal: "FileUpload", camel: "fileUpload", kebab: "file-upload" },
        { pascal: "Auth", camel: "auth", kebab: "auth" },
        { pascal: "Email", camel: "email", kebab: "email" },
      ];

      specialServices.forEach(({ pascal, camel, kebab }) => {
        const options: TemplateOptions = {
          modelName: { pascal, camel, kebab },
        };

        const result = generateServiceTemplate(options);
        expect(result).not.toContain("<");

        if (pascal === "FileUpload")
          expect(result).toContain(`("/uploads", 10 * 1024 * 1024, /.*/, 10)`);
      });
    });
  });
});
