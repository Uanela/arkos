import type {
  ArkosFile,
  UploadPrepare,
  UploadPrepareFile,
  UploadUrlPath,
} from "../../../types/upload";

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
   *   uploadDir: "/images",
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
   *   uploadDir: "/images"
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
   *     { name: "avatar", type: "single", uploadDir: "/images" },
   *     { name: "resume", type: "single", uploadDir: "/documents" },
   *     { name: "banners[][images]", type: "array", maxCount: 5, uploadDir: "/banners" }
   *   ]
   * }
   */
  | ({
      type: "fields";
      /** Array of field configurations describing multipart form fields to process */
      fields: UploadConfigFieldEntry[];
    } & Pick<
      ArkosRouterBaseUploadConfig,
      | "deleteOnError"
      | "image"
      | "uploadDir"
      | "urlPath"
      | "serve"
      | "prepare"
      | "prepareFile"
      | "overwrite"
    >)
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
   * { name: "avatar", type: "single", uploadDir: "/images", required: true }
   *
   * @example
   * // nested array path — one image per banner
   * { name: "banners[][image]", type: "single", uploadDir: "/banners" }
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
   * { name: "gallery", type: "array", maxCount: 6, uploadDir: "/gallery" }
   *
   * @example
   * // nested array path — multiple images per banner, min 1 max 5
   * { name: "banners[][images]", type: "array", minCount: 1, maxCount: 5, uploadDir: "/banners" }
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
   * Public URL for the uploaded files, relative to the file upload `baseRoute`.
   *
   * A string is a folder: the stored filename is appended. An object with
   * `exact` is the complete public path relative to `baseRoute`: nothing is
   * appended, and the path must be static.
   *
   * Requires `uploadDir` to be set.
   *
   * @since 1.8.0-rc
   *
   * @example
   * // Files stored in uploads/storage/acme but served at /api/uploads/private/files
   * uploadDir: "/storage/acme",
   * urlPath: "/private/files"
   *
   * @example
   * // The response URL is always /api/uploads/users/me/photo
   * uploadDir: "/users/:userId/photo",
   * urlPath: { exact: "/users/me/photo" }
   */
  urlPath?: UploadUrlPath;
  /**
   * Resolves the disk parameters for this upload folder. Required for every
   * dynamic folder (`:param` in `uploadDir`). It may be async and may throw to
   * deny the request.
   *
   * URL parameters are merged into the disk parameter map, with values
   * returned by `prepare` taking precedence.
   *
   * @since 1.8.0-rc
   */
  prepare?: UploadPrepare;
  /**
   * Resolves per-file data before the file is written. Only `filename` is
   * consumed. The returned filename is treated as a base name: the final
   * saved extension is always preserved.
   *
   * May be async.
   *
   * @since 1.8.0-rc
   */
  prepareFile?: UploadPrepareFile;
  /**
   * Whether a file with the same target name may be replaced.
   *
   * @default true
   * @since 1.8.0-rc
   */
  overwrite?: boolean;
  /**
   * Set to `false` to opt this upload directory out of the startup coverage
   * check when `fileUpload.serving` is `"registered"`.
   *
   * Only `false` has meaning.
   *
   * @since 1.8.0-rc
   */
  serve?: boolean;
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
  attachToBody?:
    | "pathname"
    | "url"
    | "file"
    | false
    | ((file: ArkosFile) => any);
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
   * Image optimization options applied through Sharp for image uploads.
   * When omitted, images fall back to the framework defaults (webp conversion).
   *
   * @example
   * image: { resizeTo: 1200, quality: 80 }
   * image: { format: "png", width: 800 }
   * image: { optimize: false } // store original bytes untouched
   */
  image?: {
    /**
     * Set to `false` to skip optimization entirely and store the original
     * bytes as-is, e.g. to let users upload an image "as a document".
     *
     * @default true
     */
    optimize?: boolean;
    /** Output format, defaults to `webp` */
    format?: string;
    /** Output quality (1-100) for lossy formats (webp, jpeg, avif) */
    quality?: number;
    /** Target width, keeping aspect ratio */
    width?: number;
    /** Target height, keeping aspect ratio */
    height?: number;
    /** Target size to fit within, keeping aspect ratio */
    resizeTo?: number;
    /** Resize strategy, defaults to `inside` */
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    /** Prevent upscaling images smaller than the requested dimensions */
    withoutEnlargement?: boolean;
  };
  /**
   * Open API field description
   */
  description?: string;
};
