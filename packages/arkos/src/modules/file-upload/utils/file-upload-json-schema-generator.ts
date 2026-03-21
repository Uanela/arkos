import { OpenAPIV3 } from "openapi-types";
import { getArkosConfig } from "../../../utils/helpers/arkos-config.helpers";
import deepmerge from "../../../utils/helpers/deepmerge.helper";
import { fileUploadDefaultRestrictions } from "../file-upload.service";
import { FileUploadRouterEndpoint } from "../../../types/router-config";
import { ArkosRouteConfig } from "../../../exports";
import { ExtendedOperationObject } from "../../../utils/arkos-router/types/openapi-config";

class FileUploadJsonSchemaGenerator {
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  private getFileTypeDescription(fileType: string): string {
    const arkosConfig = getArkosConfig();
    const restrictions = deepmerge(
      fileUploadDefaultRestrictions,
      arkosConfig.fileUpload?.restrictions || {}
    );

    const restriction = restrictions[fileType as keyof typeof restrictions];
    if (!restriction) return "";

    const maxSize = this.formatBytes(restriction.maxSize!);
    const maxCount = restriction.maxCount;
    const formats = restriction.supportedFilesRegex
      ?.toString()
      .replace(/\|/g, ", ")
      .replace(/\//g, "")
      .replace(/\.\*/g, "any format");

    return `Maximum file size: ${maxSize}. Maximum files per upload: ${maxCount}. Supported formats: ${formats}`;
  }

  private getMultipartRequestBody(): OpenAPIV3.RequestBodyObject {
    return {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              images: {
                type: "array",
                items: { type: "string", format: "binary" },
                description: this.getFileTypeDescription("images"),
              },
              videos: {
                type: "array",
                items: { type: "string", format: "binary" },
                description: this.getFileTypeDescription("videos"),
              },
              documents: {
                type: "array",
                items: { type: "string", format: "binary" },
                description: this.getFileTypeDescription("documents"),
              },
              files: {
                type: "array",
                items: { type: "string", format: "binary" },
                description: this.getFileTypeDescription("files"),
              },
            },
          },
        },
      },
    };
  }

  private getImageQueryParameters(): OpenAPIV3.ParameterObject[] {
    return [
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
  }

  getOpenApiConfig(
    endpointRouterConfig: Omit<ArkosRouteConfig, "path"> = {},
    endpoint: FileUploadRouterEndpoint
  ): Partial<ExtendedOperationObject> {
    const arkosConfig = getArkosConfig();
    const basePathname = arkosConfig.fileUpload?.baseRoute || "/api/uploads/";
    const cleanBasePath = basePathname.endsWith("/")
      ? basePathname.slice(0, -1)
      : basePathname;

    const existingOpenApi = endpointRouterConfig?.experimental?.openapi || {};

    switch (endpoint) {
      case "findFile": {
        const pathname = `${cleanBasePath}/*`;
        return {
          ...existingOpenApi,
          tags: ["File Upload", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary:
            existingOpenApi?.summary === pathname || !existingOpenApi?.summary
              ? "Retrieve uploaded file"
              : existingOpenApi.summary,
          description:
            existingOpenApi?.description ||
            `Serves static files from the upload directory (${arkosConfig.fileUpload?.baseUploadDir || "uploads"}). Uses wildcard path matching to serve files from any subdirectory.`,
          operationId:
            existingOpenApi?.operationId?.includes(pathname) ||
            !existingOpenApi?.operationId
              ? "findFile"
              : existingOpenApi.operationId,
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(
              [
                {
                  name: "path",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                  description:
                    "Path to the file including file type directory (e.g., images/photo.jpg)",
                },
              ] as OpenAPIV3.ParameterObject[]
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "File retrieved successfully",
              content: {
                "application/octet-stream": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
            "404": existingOpenApi?.responses?.["404"] || {
              description: "File not found",
            },
          },
        };
      }

      case "uploadFile": {
        const pathname = `${cleanBasePath}/:fileType`;
        return {
          ...existingOpenApi,
          tags: ["File Upload", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary:
            existingOpenApi?.summary === pathname || !existingOpenApi?.summary
              ? "Upload file(s)"
              : existingOpenApi.summary,
          description:
            existingOpenApi?.description ||
            "Upload one or multiple files. Supports image processing options for image uploads.",
          operationId:
            existingOpenApi?.operationId?.includes(pathname) ||
            !existingOpenApi?.operationId
              ? "uploadFile"
              : existingOpenApi.operationId,
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(
              [
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
                ...this.getImageQueryParameters(),
              ] as OpenAPIV3.ParameterObject[]
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          requestBody:
            existingOpenApi?.requestBody || this.getMultipartRequestBody(),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "File(s) uploaded successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        oneOf: [
                          {
                            type: "string",
                            description: "URL of uploaded file",
                          },
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
            "400": existingOpenApi?.responses?.["400"] || {
              description:
                "Invalid file type, size limit exceeded, or no file uploaded",
            },
          },
        };
      }

      case "updateFile": {
        const pathname = `${cleanBasePath}/:fileType/:fileName`;
        return {
          ...existingOpenApi,
          tags: ["File Upload", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary:
            existingOpenApi?.summary === pathname || !existingOpenApi?.summary
              ? "Update existing file"
              : existingOpenApi.summary,
          description:
            existingOpenApi?.description ||
            "Replace an existing file with a new one. Deletes the old file and uploads the new one.",
          operationId:
            existingOpenApi?.operationId?.includes(pathname) ||
            !existingOpenApi?.operationId
              ? "updateFile"
              : existingOpenApi.operationId,
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(
              [
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
                ...this.getImageQueryParameters(),
              ] as OpenAPIV3.ParameterObject[]
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          requestBody:
            existingOpenApi?.requestBody || this.getMultipartRequestBody(),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "File updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        oneOf: [
                          {
                            type: "string",
                            description: "URL of updated file",
                          },
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
            "400": existingOpenApi?.responses?.["400"] || {
              description:
                "Invalid file type, size limit exceeded, or no file uploaded",
            },
            "404": existingOpenApi?.responses?.["404"] || {
              description: "Original file not found",
            },
          },
        };
      }

      case "deleteFile": {
        const pathname = `${cleanBasePath}/:fileType/:fileName`;
        return {
          ...existingOpenApi,
          tags: ["File Upload", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary:
            existingOpenApi?.summary === pathname || !existingOpenApi?.summary
              ? "Delete file"
              : existingOpenApi.summary,
          description:
            existingOpenApi?.description ||
            "Delete an uploaded file from the server",
          operationId:
            existingOpenApi?.operationId?.includes(pathname) ||
            !existingOpenApi?.operationId
              ? "deleteFile"
              : existingOpenApi.operationId,
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(
              [
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
              ] as OpenAPIV3.ParameterObject[]
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "204": existingOpenApi?.responses?.["204"] || {
              description: "File deleted successfully",
            },
            "404": existingOpenApi?.responses?.["404"] || {
              description: "File not found",
            },
          },
        };
      }

      default:
        return {};
    }
  }
}

const fileUploadJsonSchemaGenerator = new FileUploadJsonSchemaGenerator();

export default fileUploadJsonSchemaGenerator;
