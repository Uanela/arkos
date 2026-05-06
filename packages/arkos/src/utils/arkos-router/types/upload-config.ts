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
      /** Name of the multipart form field to process. Supports bracket notation, including nested array paths (e.g. "banners[][image]") */
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
      /** Shared name of the multipart form fields to process. Supports bracket notation, including nested array paths (e.g. "banners[][images]") */
      field: string;
      /** Maximum number of files to process (defaults to framework config) */
      maxCount?: number;
      /** Minimum number of files required */
      minCount?: number;
    } & ArkosRouterBaseUploadConfig)
  /**
   * Creates middleware that processes multiple files associated with the
   * given form fields.
   *
   * The `Request` object will be populated with a `files` object which
   * maps each field name to an array of the associated file information
   * objects.
   *
   * Each field entry is a full single or array upload config with a `name`
   * property. Field names support bracket notation, including nested array
   * paths (e.g. "banners[][images]").
   *
   * @example
   * uploads: {
   *   type: "fields",
   *   fields: [
   *     { name: "avatar", type: "single", uploadDir: "images" },
   *     { name: "resume", type: "single", uploadDir: "documents" },
   *     { name: "banners[][images]", type: "array", maxCount: 5, uploadDir: "banners" }
   *   ]
   * }
   */
  | ({
      type: "fields";
      /** Array of field configurations describing multipart form fields to process */
      fields: UploadConfigFieldEntry[];
    } & Pick<ArkosRouterBaseUploadConfig, "deleteOnError">)
  | ({
      type: "fields";
      /** Array of field configurations describing multipart form fields to process */
      fields: {
        /** Name of the form field */
        name: string;
        /** Maximum number of files for this field (defaults to framework config) */
        maxCount?: number;
        // /** Minimum number of files required for this field */
        minCount?: number;
      }[];
    } & ArkosRouterBaseUploadConfig);

/**
 * A single field entry inside a `fields` upload config.
 * Each entry is a full single or array upload config with an additional
 * `name` property identifying the form field.
 *
 * Field names support bracket notation, including nested array paths
 * (e.g. "banners[][images]"). For nested array paths, multer validation
 * is bypassed and constraints (allowedFileTypes, maxSize, minCount, maxCount)
 * are enforced per group after upload.
 */
export type UploadConfigFieldEntry =
  /**
   * A single-file field entry.
   *
   * @example
   * { name: "avatar", type: "single", uploadDir: "images", required: true }
   *
   * @example
   * // nested array path — one image per banner
   * { name: "banners[][image]", type: "single", uploadDir: "banners" }
   */
  | ({
      /** Name of the form field. Supports bracket notation including nested array paths. */
      name: string;
      type: "single";
    } & Omit<ArkosRouterBaseUploadConfig, "deleteOnError">)
  /**
   * A multi-file field entry.
   *
   * @example
   * { name: "gallery", type: "array", maxCount: 6, uploadDir: "gallery" }
   *
   * @example
   * // nested array path — multiple images per banner, min 1 max 5
   * { name: "banners[][images]", type: "array", minCount: 1, maxCount: 5, uploadDir: "banners" }
   */
  | ({
      /** Name of the form field. Supports bracket notation including nested array paths. */
      name: string;
      type?: "array";
      /** Maximum number of files for this field (defaults to framework config) */
      maxCount?: number;
      /** Minimum number of files required for this field */
      minCount?: number;
    } & Omit<ArkosRouterBaseUploadConfig, "deleteOnError">); /**

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
   * Open API field description
   */
  description?: string;
};
