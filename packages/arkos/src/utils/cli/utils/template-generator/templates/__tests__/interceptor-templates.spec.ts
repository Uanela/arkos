import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { generateMiddlewaresTemplate } from "../interceptors-template";

jest.mock("../../../../../helpers/fs.helpers");
const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;

describe("generateMiddlewaresTemplate", () => {
  const mockModelName = {
    pascal: "User",
    camel: "user",
    kebab: "user",
  };

  it("should generate regular TypeScript interceptors template", () => {
    mockedGetUserFileExtension.mockReturnValue("ts");
    const result = generateMiddlewaresTemplate({
      modelName: mockModelName,
    });

    expect(result).not.toContain(
      "import { ArkosRequest, ArkosResponse, ArkosNextFunction }"
    );
    expect(result).not.toContain(
      "req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction"
    );
    expect(result).toContain("beforeCreateOne");
    expect(result).toContain("afterCreateOne");
    expect(result).toContain("beforeFindMany");
    expect(result).toContain("afterDeleteMany");
  });

  it("should generate auth TypeScript interceptors template", () => {
    mockedGetUserFileExtension.mockReturnValue("ts");
    const authModelName = { pascal: "Auth", camel: "auth", kebab: "auth" };
    const result = generateMiddlewaresTemplate({
      modelName: authModelName,
    });

    expect(result).toContain("beforeGetMe");
    expect(result).toContain("afterLogin");
    expect(result).toContain("beforeSignup");
    expect(result).toContain("afterUpdatePassword");
    expect(result).not.toContain("beforeCreateOne");
  });

  it("should generate file upload interceptors template", () => {
    mockedGetUserFileExtension.mockReturnValue("ts");
    const fileUploadModelName = {
      pascal: "FileUpload",
      camel: "fileUpload",
      kebab: "file-upload",
    };
    const result = generateMiddlewaresTemplate({
      modelName: fileUploadModelName,
    });

    expect(result).toContain("beforeUploadFile");
    expect(result).toContain("afterUploadFile");
    expect(result).not.toContain("beforeCreateOne");
  });

  it("should generate JavaScript interceptors template", () => {
    mockedGetUserFileExtension.mockReturnValue("js");
    const result = generateMiddlewaresTemplate({
      modelName: mockModelName,
    });

    expect(result).not.toContain("ArkosRequest");
    expect(result).toContain("[]");
    expect(result).toContain("beforeCreateOne");
  });

  it("should handle file-upload kebab case", () => {
    mockedGetUserFileExtension.mockReturnValue("ts");
    const fileUploadModelName = {
      pascal: "FileUpload",
      camel: "file-upload",
      kebab: "file-upload",
    };
    const result = generateMiddlewaresTemplate({
      modelName: fileUploadModelName,
    });

    expect(result).toContain("beforeUploadFile");
    expect(result).toContain("afterUploadFile");
  });

  it("should throw error without model name", () => {
    expect(() => generateMiddlewaresTemplate({} as any)).toThrow(
      "Module name is required for middleware template"
    );
  });
});
