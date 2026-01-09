export type UploadConfig =
  /**
   * Creates middleware that processes a single file associated with the
   * given form field.
   *
   * The `Request` object will be populated with a `file` object containing
   * information about the processed file.
   *
   * @example
   * uploads: {
   *   type: "single",
   *   field: "avatar",
   *   uploadDir: "images",
   *   maxSize: 1024 * 1024 * 5 // 5MB
   * }
   */
  | ({
      type: "single";
      /** Name of the multipart form field to process */
      field: string;
    } & ArkosRouterBaseUploadConfig)
  /**
   * Returns middleware that processes multiple files sharing the same field
   * name.
   *
   * The `Request` object will be populated with a `files` array containing
   * an information object for each processed file.
   *
   * @throws `MulterError('LIMIT_UNEXPECTED_FILE')` if more than `maxCount` files are associated with `fieldName`
   *
   * @example
   * uploads: {
   *   type: "array",
   *   field: "gallery",
   *   maxCount: 10,
   *   minCount: 1,
   *   uploadDir: "images"
   * }
   */
  | ({
      type: "array";
      /** Shared name of the multipart form fields to process */
      field: string;
      /** Maximum number of files to process (defaults to framework config) */
      maxCount?: number;
      /** Minimum number of files required */
      // minCount?: number;
    } & ArkosRouterBaseUploadConfig)
  /**
   * Creates middleware that processes multiple files associated with the
   * given form fields.
   *
   * The `Request` object will be populated with a `files` object which
   * maps each field name to an array of the associated file information
   * objects.
   *
   * @throws `MulterError('LIMIT_UNEXPECTED_FILE')` if more than `maxCount` files are associated with `fieldName` for any field
   *
   * @example
   * uploads: {
   *   type: "fields",
   *   fields: [
   *     { field: "avatar", maxCount: 1, uploadDir: "images" },
   *     { field: "resume", maxCount: 1, uploadDir: "documents" }
   *   ]
   * }
   */
  | ({
      type: "fields";
      /** Array of field configurations describing multipart form fields to process */
      fields: {
        /** Name of the form field */
        name: string;
        /** Maximum number of files for this field (defaults to framework config) */
        maxCount?: number;
        // /** Minimum number of files required for this field */
        // minCount?: number;
      }[];
    } & ArkosRouterBaseUploadConfig);

/**
 * Base configuration options for file uploads.
 * These settings can override framework-level defaults for specific routes.
 */
export type ArkosRouterBaseUploadConfig = {
  /**
   * Directory category where files will be stored.
   * Each category has its own default restrictions defined in framework config.
   *
   * @remarks Do not include the `baseUploadDir` defined under your arkos config
   * @default Depends on the file type which is descovered by the file mimetype, otherwise falls to files.
   */
  uploadDir?: string;
  /**
   * Whether to automatically delete uploaded files if an error occurs during request processing.
   * Cleanup happens when errors are thrown and not caught within the route handler.
   *
   * @default false
   */
  deleteOnError?: boolean;
  /**
   * How to attach file information to req.body for easier access in handlers and validation.
   * - "pathname": Just the relative path (e.g., "images/avatar-123.jpg")
   * - "url": Complete URL (e.g., "https://api.com/uploads/images/avatar-123.jpg")
   * - "file": The complete Multer file object with all metadata
   *
   * @default "pathname"
   *
   * @remarks
   * When using validation, the attached format will be available in your validated body.
   * For array/fields uploads, an array of the specified format will be attached.
   */
  attachToBody?: "pathname" | "url" | "file" | false;
  /**
   * Maximum file size in bytes.
   * Overrides the framework-level default for this uploadDir category.
   *
   * @example
   * maxSize: 1024 * 1024 * 5 // 5MB
   * maxSize: 1024 * 1024 * 50 // 50MB
   */
  maxSize?: number;
  /**
   * Allowed file types/extensions.
   * Can be an array of extensions/MIME types or a RegExp pattern.
   * Overrides the framework-level default for this uploadDir category.
   *
   * @example
   * // Array of extensions
   * allowedFileTypes: [".jpg", ".png", ".gif"]
   *
   * @example
   * // Array of MIME types
   * allowedFileTypes: ["image/jpeg", "image/png"]
   *
   * @example
   * // RegExp pattern
   * allowedFileTypes: /jpeg|jpg|png|gif/
   */
  allowedFileTypes?: string[] | RegExp;
  /**
   * Defines if this file field is required
   *
   * @default true
   */
  required?: boolean;
  /**
   * Open api field description
   */
  description?: string;
};
