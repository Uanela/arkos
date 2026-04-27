import multer from "multer";
import AppError from "./app-error";

class MulterErrorHandler {
  handle(err: multer.MulterError): AppError {
    switch (err.code) {
      case "LIMIT_UNEXPECTED_FILE":
        return new AppError(
          `Unexpected file field '${err.field}'`,
          400,
          "UnexpectedFileField",
          {
            hint: "Ensure the field name matches the expected upload configuration",
          }
        );
      case "LIMIT_FILE_SIZE":
        return new AppError(
          `File in field '${err.field}' exceeds the maximum allowed size`,
          413,
          "FileTooLarge",
          {
            hint: "Upload a smaller file or contact the server administrator to increase the limit",
          }
        );
      case "LIMIT_FILE_COUNT":
        return new AppError(`Too many files uploaded`, 400, "TooManyFiles", {
          hint: "Reduce the number of files and try again",
        });
      case "LIMIT_FIELD_COUNT":
        return new AppError(
          `Too many fields in the request`,
          400,
          "TooManyFields",
          { hint: "Reduce the number of form fields and try again" }
        );
      case "LIMIT_PART_COUNT":
        return new AppError(
          `Too many parts in the multipart request`,
          400,
          "TooManyParts",
          { hint: "Reduce the number of parts in your multipart request" }
        );
      case "LIMIT_FIELD_KEY":
        return new AppError(
          `A field name in the request is too long`,
          400,
          "FieldNameTooLong",
          { hint: "Shorten your form field names" }
        );
      case "LIMIT_FIELD_VALUE":
        return new AppError(
          `Value of field '${err.field}' is too long`,
          400,
          "FieldValueTooLong",
          { hint: "Shorten the value and try again" }
        );
      case "MISSING_FIELD_NAME":
        return new AppError(
          `A file was uploaded without a field name`,
          400,
          "MissingFieldName",
          { hint: "Ensure all file inputs have a valid field name" }
        );
      default:
        return new AppError(
          `An unexpected file upload error occurred`,
          500,
          "FileUploadError"
        );
    }
  }
}

const multerErrorHandler = new MulterErrorHandler();

export default multerErrorHandler;
