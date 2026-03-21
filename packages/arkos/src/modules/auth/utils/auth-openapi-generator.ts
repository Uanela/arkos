import { AuthRouterEndpoint } from "../../../types/router-config";
import { ArkosRouteConfig } from "../../../exports";
import { ExtendedOperationObject } from "../../../utils/arkos-router/types/openapi-config";
import { OpenAPIV3 } from "openapi-types";
import authPrismaJsonSchemaGenerator from "./auth-prisma-json-schema-generator";
import { getArkosConfig } from "../../../utils/helpers/arkos-config.helpers";

class AuthOpenAPIGenerator {
  getOpenApiConfig(
    endpointRouterConfig: Omit<ArkosRouteConfig, "path"> = {},
    endpoint: AuthRouterEndpoint
  ): Partial<ExtendedOperationObject> {
    const existingOpenApi = endpointRouterConfig?.experimental?.openapi || {};
    const hasBodyValidation =
      typeof endpointRouterConfig?.validation !== "boolean" &&
      !!endpointRouterConfig?.validation?.body;

    switch (endpoint) {
      case "login":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Login to the system",
          description:
            existingOpenApi?.description ||
            "Authenticates a user and returns an access token",
          operationId: existingOpenApi?.operationId || "login",
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              required: true,
              content: {
                "application/json": {
                  schema: authPrismaJsonSchemaGenerator.generateLoginSchema(),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      accessToken: {
                        type: "string",
                        description: "JWT access token",
                      },
                    },
                  },
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data",
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Invalid credentials",
            },
          },
        };

      case "logout":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Logout from the system",
          description:
            existingOpenApi?.description ||
            "Invalidates the current user's JWT token",
          operationId: existingOpenApi?.operationId || "logout",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "204": existingOpenApi?.responses?.["204"] || {
              description: "Logout successful",
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
          },
        };

      case "signup":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Register a new user",
          description:
            existingOpenApi?.description || "Creates a new user account",
          operationId: existingOpenApi?.operationId || "signup",
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              description: "User registration data",
              required: true,
              content: {
                "application/json": {
                  schema: authPrismaJsonSchemaGenerator.generateSignupSchema(),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "201": existingOpenApi?.responses?.["201"] || {
              description: "User created successfully",
              content: {
                "application/json": {
                  schema: authPrismaJsonSchemaGenerator.generateGetMeResponse(),
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data",
            },
            "409": existingOpenApi?.responses?.["409"] || {
              description: "User already exists",
            },
          },
        };

      case "updatePassword":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Update user password",
          description:
            existingOpenApi?.description ||
            "Changes the password for the authenticated user",
          operationId: existingOpenApi?.operationId || "updatePassword",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              required: true,
              content: {
                "application/json": {
                  schema:
                    authPrismaJsonSchemaGenerator.generateUpdatePasswordSchema(),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "Password updated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "success" },
                      message: {
                        type: "string",
                        example: "Password updated successfully!",
                      },
                    },
                  },
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data or current password incorrect",
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
          },
        };

      case "getMe":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Get current user information",
          description:
            existingOpenApi?.description ||
            "Retrieves information about the currently authenticated user",
          operationId: existingOpenApi?.operationId || "getMe",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "User information retrieved successfully",
              content: {
                "application/json": {
                  schema: authPrismaJsonSchemaGenerator.generateGetMeResponse(),
                },
              },
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
          },
        };

      case "updateMe":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary:
            existingOpenApi?.summary || "Update current user information",
          description:
            existingOpenApi?.description ||
            "Updates information for the currently authenticated user",
          operationId: existingOpenApi?.operationId || "updateMe",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              description: "User data to update",
              required: true,
              content: {
                "application/json": {
                  schema:
                    authPrismaJsonSchemaGenerator.generateUpdateMeSchema(),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "User updated successfully",
              content: {
                "application/json": {
                  schema: authPrismaJsonSchemaGenerator.generateGetMeResponse(),
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data",
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
          },
        };

      case "deleteMe":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Delete current user account",
          description:
            existingOpenApi?.description ||
            "Marks the current user's account as deleted",
          operationId: existingOpenApi?.operationId || "deleteMe",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "Account deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "Account deleted successfully",
                      },
                    },
                  },
                },
              },
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
          },
        };

      case "findManyAuthAction":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary: existingOpenApi?.summary || "Get all authentication actions",
          description:
            existingOpenApi?.description ||
            "Retrieves a list of all available authentication actions and permissions",
          operationId: existingOpenApi?.operationId || "findManyAuthAction",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: "Auth actions retrieved successfully",
              content: {
                "application/json": {
                  schema: this.getAuthActionSchema(),
                },
              },
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
            "403": existingOpenApi?.responses?.["403"] || {
              description: "Insufficient permissions",
            },
          },
        };

      case "findOneAuthAction":
        return {
          ...existingOpenApi,
          tags: ["Authentication", ...(existingOpenApi?.tags || [])].filter(
            (tag) => tag !== "Defaults"
          ),
          summary:
            existingOpenApi?.summary ||
            "Get authentication actions by resource",
          description:
            existingOpenApi?.description ||
            "Retrieves all authentication actions for a specific resource",
          operationId: existingOpenApi?.operationId || "findOneAuthAction",
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(
              [
                {
                  name: "resourceName",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                  description:
                    "Name of the resource to retrieve auth actions for",
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
              description: "Auth actions for resource retrieved successfully",
              content: {
                "application/json": {
                  schema: this.getAuthActionSchema(),
                },
              },
            },
            "401": existingOpenApi?.responses?.["401"] || {
              description: "Authentication required",
            },
            "403": existingOpenApi?.responses?.["403"] || {
              description: "Insufficient permissions",
            },
            "404": existingOpenApi?.responses?.["404"] || {
              description: "Resource not found",
            },
          },
        };

      default:
        return {};
    }
  }

  private getAuthActionSchema() {
    const arkosConfig = getArkosConfig();
    const isDynamicMode = arkosConfig?.authentication?.mode === "dynamic";

    const properties: Record<string, any> = {
      action: {
        type: "string",
        description: "Action name, e.g Create, View, Update, Download, Cancel",
      },
      resource: {
        type: "string",
        description: "Resource name, e.g user, user-role, product, author",
      },
      name: {
        type: "string",
        description: "Human-readable name for this permission",
        nullable: true,
      },
      description: {
        type: "string",
        description: "Detailed description of what this permission allows",
        nullable: true,
      },
      errorMessage: {
        type: "string",
        description: "Error message returned on forbidden response",
        nullable: true,
      },
    };

    if (!isDynamicMode) {
      properties.roles = {
        type: "array",
        description: "Role names that have this permission, e.g Admin, Manager",
        items: { type: "string" },
      };
    }

    return {
      type: "object",
      properties,
      required: ["action", "resource"],
      additionalProperties: false,
    };
  }
}

const authOpenAPIGenerator = new AuthOpenAPIGenerator();

export default authOpenAPIGenerator;
