import multer from "multer";
import multerErrorHandler from "../multer-error-handler";
import AppError from "../app-error";

const makeMulterError = (code: string, field?: string): multer.MulterError => {
  const err = new multer.MulterError(code as any, field);
  return err;
};

describe("multerErrorHandler.handle", () => {
  it("handles LIMIT_UNEXPECTED_FILE", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_UNEXPECTED_FILE", "avatar")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("UnexpectedFileField");
    expect(result.message).toContain("avatar");
    expect(result.meta).toEqual({
      hint: "Ensure the field name matches the expected upload configuration",
    });
  });

  it("handles LIMIT_FILE_SIZE", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_FILE_SIZE", "photo")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(413);
    expect(result.code).toBe("FileTooLarge");
    expect(result.message).toContain("photo");
    expect(result.meta).toEqual({
      hint: "Upload a smaller file or contact the server administrator to increase the limit",
    });
  });

  it("handles LIMIT_FILE_COUNT", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_FILE_COUNT")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("TooManyFiles");
    expect(result.meta).toEqual({
      hint: "Reduce the number of files and try again",
    });
  });

  it("handles LIMIT_FIELD_COUNT", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_FIELD_COUNT")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("TooManyFields");
    expect(result.meta).toEqual({
      hint: "Reduce the number of form fields and try again",
    });
  });

  it("handles LIMIT_PART_COUNT", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_PART_COUNT")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("TooManyParts");
    expect(result.meta).toEqual({
      hint: "Reduce the number of parts in your multipart request",
    });
  });

  it("handles LIMIT_FIELD_KEY", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_FIELD_KEY")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("FieldNameTooLong");
    expect(result.meta).toEqual({ hint: "Shorten your form field names" });
  });

  it("handles LIMIT_FIELD_VALUE", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("LIMIT_FIELD_VALUE", "bio")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("FieldValueTooLong");
    expect(result.message).toContain("bio");
    expect(result.meta).toEqual({ hint: "Shorten the value and try again" });
  });

  it("handles MISSING_FIELD_NAME", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("MISSING_FIELD_NAME")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("MissingFieldName");
    expect(result.meta).toEqual({
      hint: "Ensure all file inputs have a valid field name",
    });
  });

  it("handles unknown code with 500", () => {
    const result = multerErrorHandler.handle(
      makeMulterError("SOME_UNKNOWN_CODE")
    );
    expect(result).toBeInstanceOf(AppError);
    expect(result.statusCode).toBe(500);
    expect(result.code).toBe("FileUploadError");
    expect(result.meta).toBeUndefined();
  });
});
