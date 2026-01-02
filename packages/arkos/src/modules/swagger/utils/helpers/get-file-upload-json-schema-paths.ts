import { OpenAPIV3 } from "openapi-types";
import { ArkosConfig, RouterConfig } from "../../../../exports";
import { getModuleComponents } from "../../../../utils/dynamic-loader";
import { isEndpointDisabled } from "../../../base/utils/helpers/base.router.helpers";
import deepmerge from "../../../../utils/helpers/deepmerge.helper";
import { fileUploadDefaultRestrictions } from "../../../file-upload/file-upload.service";

export default function getFileUploadJsonSchemaPaths(
  arkosConfig: ArkosConfig,
  existingPaths: OpenAPIV3.PathsObject
) {
  const paths: OpenAPIV3.PathsObject = { ...existingPaths };

  if (!arkosConfig.fileUpload) return paths;

  const FileUploadModuleComponents = getModuleComponents("file-upload");
  const routerConfig = FileUploadModuleComponents?.router
    ?.config as RouterConfig<"file-upload">;
  const authConfigs = FileUploadModuleComponents?.authConfigs;

  if (routerConfig?.disable === true) return paths;

  const isFileUploadEndpointDisabled = (endpoint: string): boolean => {
    return isEndpointDisabled(routerConfig, endpoint as any);
  };

  const basePathname = arkosConfig.fileUpload?.baseRoute || "/api/uploads/";
  const baseUploadDir = arkosConfig.fileUpload?.baseUploadDir || "uploads";

  const restrictions = deepmerge(
    fileUploadDefaultRestrictions,
    arkosConfig.fileUpload?.restrictions || {}
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileTypeDescription = (fileType: string): string => {
    const restriction = restrictions[fileType as keyof typeof restrictions];
    if (!restriction) return "";

    const maxSize = formatBytes(restriction.maxSize!);
    const maxCount = restriction.maxCount;
    const formats = restriction.supportedFilesRegex
      ?.toString()
      .replace(/\|/g, ", ")
      .replace(/\//g, "")
      .replace(/\.\*/g, "any format");

    return `Maximum file size: ${maxSize}. Maximum files per upload: ${maxCount}. Supported formats: ${formats}`;
  };

  const shouldIncludeSecurity = (
    action: "View" | "Create" | "Update" | "Delete"
  ): boolean => {
    const authControl = authConfigs?.authenticationControl;
    if (!authControl) return false;

    if (typeof authControl === "boolean") return authControl;
    if (typeof authControl === "object") {
      return authControl[action] === true;
    }

    return false;
  };

  // Find File - GET /{filePath*}
  if (!isFileUploadEndpointDisabled("findFile")) {
    const cleanBasePath = basePathname.endsWith("/")
      ? basePathname.slice(0, -1)
      : basePathname;
    const pathname = `${cleanBasePath}/{filePath*}`;

    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.get;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "filePath",
        in: "path",
        required: true,
        schema: { type: "string" },
        description:
          "Path to the file including file type directory (e.g., images/photo.jpg, videos/clip.mp4)",
      },
    ];

    const existingParams =
      (currentPath?.parameters as OpenAPIV3.ParameterObject[]) || [];
    const existingParamKeys = new Set(
      existingParams.map((p) => `${p.in}-${p.name}`)
    );

    const mergedParameters = [
      ...existingParams,
      ...defaultParameters.filter(
        (p) => !existingParamKeys.has(`${p.in}-${p.name}`)
      ),
    ];

    const defaultSpec = {
      tags: ["File Upload", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Retrieve uploaded file"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        `Serves static files from the upload directory (${baseUploadDir}). This endpoint uses wildcard path matching to serve files from any subdirectory.`,
      operationId: currentPath?.operationId || "findFile",
      ...(shouldIncludeSecurity("View") && {
        security: [{ BearerAuth: [] }],
      }),
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "File retrieved successfully",
          content: {
            "application/octet-stream": {
              schema: {
                type: "string",
                format: "binary",
              },
            },
          },
        },
        "404": currentPath?.responses?.["404"] || {
          description: "File not found",
        },
        ...(shouldIncludeSecurity("View") && {
          "401": currentPath?.responses?.["401"] || {
            description: "Authentication required",
          },
          "403": currentPath?.responses?.["403"] || {
            description: "Insufficient permissions to view files",
          },
        }),
      },
    };

    paths[pathname]!.get = { ...(currentPath || {}), ...defaultSpec };
  }

  // Upload File - POST /{fileType}
  if (!isFileUploadEndpointDisabled("uploadFile")) {
    const cleanBasePath = basePathname.endsWith("/")
      ? basePathname.slice(0, -1)
      : basePathname;
    const pathname = `${cleanBasePath}/{fileType}`;

    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.post;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "fileType",
        in: "path",
        required: true,
        schema: {
          type: "string",
          enum: ["images", "videos", "documents", "files"],
        },
        description: "Type of file being uploaded",
      },
      {
        name: "format",
        in: "query",
        required: false,
        schema: {
          type: "string",
          enum: ["jpeg", "jpg", "png", "webp", "gif", "avif"],
        },
        description:
          "Image format for conversion (only applicable for fileType=images)",
      },
      {
        name: "width",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1 },
        description:
          "Target width for image resize (only applicable for fileType=images)",
      },
      {
        name: "height",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1 },
        description:
          "Target height for image resize (only applicable for fileType=images)",
      },
      {
        name: "resizeTo",
        in: "query",
        required: false,
        schema: {
          type: "string",
          enum: ["cover", "contain", "fill", "inside", "outside"],
        },
        description: "Resize strategy (only applicable for fileType=images)",
      },
    ];

    const existingParams =
      (currentPath?.parameters as OpenAPIV3.ParameterObject[]) || [];
    const existingParamKeys = new Set(
      existingParams.map((p) => `${p.in}-${p.name}`)
    );

    const mergedParameters = [
      ...existingParams,
      ...defaultParameters.filter(
        (p) => !existingParamKeys.has(`${p.in}-${p.name}`)
      ),
    ];

    const defaultSpec = {
      tags: ["File Upload", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Upload file(s)"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Upload one or multiple files. Supports image processing options for image uploads.",
      operationId: currentPath?.operationId || "uploadFile",
      ...(shouldIncludeSecurity("Create") && {
        security: [{ BearerAuth: [] }],
      }),
      parameters: mergedParameters,
      requestBody: currentPath?.requestBody || {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                images: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("images"),
                },
                videos: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("videos"),
                },
                documents: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("documents"),
                },
                files: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("files"),
                },
              },
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "File(s) uploaded successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    oneOf: [
                      { type: "string", description: "URL of uploaded file" },
                      {
                        type: "array",
                        items: { type: "string" },
                        description: "URLs of uploaded files",
                      },
                    ],
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description:
            "Invalid file type, size limit exceeded, or no file uploaded",
        },
        ...(shouldIncludeSecurity("Create") && {
          "401": currentPath?.responses?.["401"] || {
            description: "Authentication required",
          },
          "403": currentPath?.responses?.["403"] || {
            description: "Insufficient permissions to upload files",
          },
        }),
      },
    };

    paths[pathname]!.post = { ...(currentPath || {}), ...defaultSpec };
  }

  // Update File - PATCH /{fileType}/{fileName}
  if (!isFileUploadEndpointDisabled("updateFile")) {
    const cleanBasePath = basePathname.endsWith("/")
      ? basePathname.slice(0, -1)
      : basePathname;
    const pathname = `${cleanBasePath}/{fileType}/{fileName}`;

    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.patch;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "fileType",
        in: "path",
        required: true,
        schema: {
          type: "string",
          enum: ["images", "videos", "documents", "files"],
        },
        description: "Type of file being updated",
      },
      {
        name: "fileName",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Name of the file to update",
      },
      {
        name: "format",
        in: "query",
        required: false,
        schema: {
          type: "string",
          enum: ["jpeg", "jpg", "png", "webp", "gif", "avif"],
        },
        description:
          "Image format for conversion (only applicable for fileType=images)",
      },
      {
        name: "width",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1 },
        description:
          "Target width for image resize (only applicable for fileType=images)",
      },
      {
        name: "height",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1 },
        description:
          "Target height for image resize (only applicable for fileType=images)",
      },
      {
        name: "resizeTo",
        in: "query",
        required: false,
        schema: {
          type: "string",
          enum: ["cover", "contain", "fill", "inside", "outside"],
        },
        description: "Resize strategy (only applicable for fileType=images)",
      },
    ];

    const existingParams =
      (currentPath?.parameters as OpenAPIV3.ParameterObject[]) || [];
    const existingParamKeys = new Set(
      existingParams.map((p) => `${p.in}-${p.name}`)
    );

    const mergedParameters = [
      ...existingParams,
      ...defaultParameters.filter(
        (p) => !existingParamKeys.has(`${p.in}-${p.name}`)
      ),
    ];

    const defaultSpec = {
      tags: ["File Upload", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Update existing file"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Replace an existing file with a new one. Deletes the old file and uploads the new one.",
      operationId: currentPath?.operationId || "updateFile",
      ...(shouldIncludeSecurity("Update") && {
        security: [{ BearerAuth: [] }],
      }),
      parameters: mergedParameters,
      requestBody: currentPath?.requestBody || {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                images: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("images"),
                },
                videos: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("videos"),
                },
                documents: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("documents"),
                },
                files: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                  description: getFileTypeDescription("files"),
                },
              },
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "File updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    oneOf: [
                      { type: "string", description: "URL of updated file" },
                      {
                        type: "array",
                        items: { type: "string" },
                        description: "URLs of updated files",
                      },
                    ],
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description:
            "Invalid file type, size limit exceeded, or no file uploaded",
        },
        "404": currentPath?.responses?.["404"] || {
          description: "Original file not found",
        },
        ...(shouldIncludeSecurity("Update") && {
          "401": currentPath?.responses?.["401"] || {
            description: "Authentication required",
          },
          "403": currentPath?.responses?.["403"] || {
            description: "Insufficient permissions to update files",
          },
        }),
      },
    };

    paths[pathname]!.patch = { ...(currentPath || {}), ...defaultSpec };
  }

  // Delete File - DELETE /{fileType}/{fileName}
  if (!isFileUploadEndpointDisabled("deleteFile")) {
    const cleanBasePath = basePathname.endsWith("/")
      ? basePathname.slice(0, -1)
      : basePathname;
    const pathname = `${cleanBasePath}/{fileType}/{fileName}`;

    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.delete;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "fileType",
        in: "path",
        required: true,
        schema: {
          type: "string",
          enum: ["images", "videos", "documents", "files"],
        },
        description: "Type of file being deleted",
      },
      {
        name: "fileName",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Name of the file to delete",
      },
    ];

    const existingParams =
      (currentPath?.parameters as OpenAPIV3.ParameterObject[]) || [];
    const existingParamKeys = new Set(
      existingParams.map((p) => `${p.in}-${p.name}`)
    );

    const mergedParameters = [
      ...existingParams,
      ...defaultParameters.filter(
        (p) => !existingParamKeys.has(`${p.in}-${p.name}`)
      ),
    ];

    const defaultSpec = {
      tags: ["File Upload", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Delete file"
          : currentPath?.summary,
      description:
        currentPath?.description || "Delete an uploaded file from the server",
      operationId: currentPath?.operationId || "deleteFile",
      ...(shouldIncludeSecurity("Delete") && {
        security: [{ BearerAuth: [] }],
      }),
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "204": currentPath?.responses?.["204"] || {
          description: "File deleted successfully",
        },
        "404": currentPath?.responses?.["404"] || {
          description: "File not found",
        },
        ...(shouldIncludeSecurity("Delete") && {
          "401": currentPath?.responses?.["401"] || {
            description: "Authentication required",
          },
          "403": currentPath?.responses?.["403"] || {
            description: "Insufficient permissions to delete files",
          },
        }),
      },
    };

    paths[pathname]!.delete = { ...(currentPath || {}), ...defaultSpec };
  }

  return paths;
}
