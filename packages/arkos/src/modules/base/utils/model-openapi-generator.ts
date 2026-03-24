import { ArkosRouteConfig } from "../../../exports";
import {
  PrismaQueryOptions,
  prismaSchemaParser,
} from "../../../exports/prisma";
import { kebabCase, pascalCase } from "../../../exports/utils";
import { RouterEndpoint } from "../../../types/router-config";
import { ExtendedOperationObject } from "../../../utils/arkos-router/types/openapi-config";
import { isAuthenticationEnabled } from "../../../utils/helpers/arkos-config.helpers";
import { capitalize } from "../../../utils/helpers/text.helpers";
import prismaJsonSchemaGenerator from "../../../utils/prisma/prisma-json-schema-generator";
import pluralize from "pluralize";

class ModelOpenAPIGenerator {
  private getModel(modelName: string) {
    return prismaSchemaParser.models.find(
      (m) => kebabCase(m.name) === kebabCase(modelName)
    )!;
  }

  private getAuthErrorResponses(): Record<string, any> {
    if (!isAuthenticationEnabled()) return {};
    return {
      "401": { description: "Authentication required" },
      "403": { description: "Insufficient permissions" },
    };
  }

  private resolvePrismaQueryOptions(
    prismaQueryOptions: PrismaQueryOptions<any> | undefined,
    action: string
  ): Record<string, any> {
    if (!prismaQueryOptions) return {};
    const options = prismaQueryOptions as any;
    let merged = options.queryOptions || {};
    if (options.global) merged = { ...merged, ...options.global };

    const actionMap: Record<string, string[]> = {
      find: ["findOne", "findMany"],
      create: ["createOne", "createMany"],
      update: ["updateOne", "updateMany"],
      delete: ["deleteOne", "deleteMany"],
      save: ["createOne", "createMany", "updateOne", "updateMany"],
      saveOne: ["createOne", "updateOne"],
      saveMany: ["createMany", "updateMany"],
    };

    for (const [key, actions] of Object.entries(actionMap)) {
      if (actions.includes(action) && options[key])
        merged = { ...merged, ...options[key] };
    }

    if (options[action]) merged = { ...merged, ...options[action] };
    return merged;
  }

  getOpenApiConfig(
    endpointRouterConfig: Omit<ArkosRouteConfig, "path"> = {},
    endpoint: RouterEndpoint,
    modelNameInKebab: string,
    prismaQueryOptions?: PrismaQueryOptions<any>
  ): Partial<ExtendedOperationObject> {
    const existingOpenApi = endpointRouterConfig?.experimental?.openapi || {};
    const hasBodyValidation =
      typeof endpointRouterConfig?.validation !== "boolean" &&
      !!endpointRouterConfig?.validation?.body;
    const hasQueryValidation =
      typeof endpointRouterConfig?.validation !== "boolean" &&
      !!endpointRouterConfig?.validation?.query;
    const hasParamsValidation =
      typeof endpointRouterConfig?.validation !== "boolean" &&
      !!endpointRouterConfig?.validation?.params;

    const model = this.getModel(modelNameInKebab);
    const pascalModelName = pascalCase(modelNameInKebab);
    const humanReadableName = modelNameInKebab.replaceAll("-", " ");
    const humanReadableNamePlural = pluralize.plural(humanReadableName);
    const authErrors = this.getAuthErrorResponses();

    switch (endpoint) {
      case "createOne":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary:
            existingOpenApi?.summary || `Create a new ${humanReadableName}`,
          description:
            existingOpenApi?.description ||
            `Creates a new ${humanReadableName} record in the system`,
          operationId:
            existingOpenApi?.operationId || `create${pascalModelName}`,
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              description: `${humanReadableName} data to create`,
              required: true,
              content: {
                "application/json": {
                  schema: prismaJsonSchemaGenerator.generateCreateSchema(model),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "201": existingOpenApi?.responses?.["201"] || {
              description: `${humanReadableName} created successfully`,
              content: {
                "application/json": {
                  schema: prismaJsonSchemaGenerator.generateResponseSchema(
                    model,
                    this.resolvePrismaQueryOptions(
                      prismaQueryOptions,
                      "createOne"
                    )
                  ),
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data provided",
            },
            ...authErrors,
          },
        };

      case "findMany":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary: existingOpenApi?.summary || `Get ${humanReadableNamePlural}`,
          description:
            existingOpenApi?.description ||
            `Retrieves a paginated list of ${humanReadableNamePlural} with optional filtering and sorting`,
          operationId:
            existingOpenApi?.operationId ||
            `find${pluralize.plural(pascalModelName)}`,
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(!hasQueryValidation
              ? (prismaJsonSchemaGenerator.generateQueryFilterParameters(
                  model
                ) as any[])
              : []
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
              description: `List of ${humanReadableNamePlural} retrieved successfully`,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total: {
                        type: "integer",
                        description:
                          "Total number of records matching the criteria",
                      },
                      results: {
                        type: "integer",
                        description:
                          "Number of records returned in current page",
                      },
                      data: {
                        type: "array",
                        items: prismaJsonSchemaGenerator.generateResponseSchema(
                          model,
                          this.resolvePrismaQueryOptions(
                            prismaQueryOptions,
                            "findMany"
                          )
                        ),
                      },
                    },
                  },
                },
              },
            },
            ...authErrors,
          },
        };

      case "createMany":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary:
            existingOpenApi?.summary ||
            `Create multiple ${humanReadableNamePlural}`,
          description:
            existingOpenApi?.description ||
            `Creates multiple ${humanReadableNamePlural} records in a single batch operation`,
          operationId:
            existingOpenApi?.operationId || `createMany${pascalModelName}`,
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              description: `Array of ${humanReadableName} data to create`,
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items:
                      prismaJsonSchemaGenerator.generateCreateSchema(model),
                  },
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "201": existingOpenApi?.responses?.["201"] || {
              description: `${humanReadableNamePlural} created successfully`,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: {
                        type: "integer",
                        description: "Number of records created",
                      },
                    },
                  },
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data provided",
            },
            ...authErrors,
          },
        };

      case "updateMany":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary:
            existingOpenApi?.summary ||
            `Update multiple ${humanReadableNamePlural}`,
          description:
            existingOpenApi?.description ||
            `Updates multiple ${humanReadableNamePlural} records that match the specified filter criteria`,
          operationId:
            existingOpenApi?.operationId || `updateMany${pascalModelName}`,
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(!hasQueryValidation
              ? prismaJsonSchemaGenerator.generateQueryFilterParameters(model, {
                  modelFieldsOnly: true,
                })
              : []
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              description: `Partial ${humanReadableName} data to update`,
              required: true,
              content: {
                "application/json": {
                  schema: prismaJsonSchemaGenerator.generateUpdateSchema(model),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: `${humanReadableNamePlural} updated successfully`,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: {
                        type: "integer",
                        description: "Number of records updated",
                      },
                    },
                  },
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data or missing filter criteria",
            },
            ...authErrors,
          },
        };

      case "deleteMany":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary:
            existingOpenApi?.summary ||
            `Delete multiple ${humanReadableNamePlural}`,
          description:
            existingOpenApi?.description ||
            `Deletes multiple ${humanReadableNamePlural} records that match the specified filter criteria`,
          operationId:
            existingOpenApi?.operationId || `deleteMany${pascalModelName}`,
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(!hasQueryValidation
              ? prismaJsonSchemaGenerator.generateQueryFilterParameters(model, {
                  modelFieldsOnly: true,
                })
              : []
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: `${humanReadableNamePlural} deleted successfully`,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      count: {
                        type: "integer",
                        description: "Number of records deleted",
                      },
                    },
                  },
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Missing filter criteria",
            },
            ...authErrors,
          },
        };

      case "findOne":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary: existingOpenApi?.summary || `Get ${humanReadableName} by ID`,
          description:
            existingOpenApi?.description ||
            `Retrieves a single ${humanReadableName} record by its unique identifier`,
          operationId:
            existingOpenApi?.operationId || `find${pascalModelName}ById`,
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(!hasParamsValidation
              ? ([
                  {
                    name: "id",
                    in: "path",
                    description: `Unique identifier of the ${humanReadableName}`,
                    required: true,
                    schema: { type: "string" },
                  },
                ] as any[])
              : []
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
              description: `${humanReadableName} retrieved successfully`,
              content: {
                "application/json": {
                  schema: prismaJsonSchemaGenerator.generateResponseSchema(
                    model,
                    this.resolvePrismaQueryOptions(
                      prismaQueryOptions,
                      "findOne"
                    )
                  ),
                },
              },
            },
            ...authErrors,
            "404": existingOpenApi?.responses?.["404"] || {
              description: `${humanReadableName} not found`,
            },
          },
        };

      case "updateOne":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary:
            existingOpenApi?.summary || `Update ${humanReadableName} by ID`,
          description:
            existingOpenApi?.description ||
            `Updates a single ${humanReadableName} record by its unique identifier`,
          operationId:
            existingOpenApi?.operationId || `update${pascalModelName}`,
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(!hasParamsValidation
              ? ([
                  {
                    name: "id",
                    in: "path",
                    description: `Unique identifier of the ${humanReadableName}`,
                    required: true,
                    schema: { type: "string" },
                  },
                ] as any[])
              : []
            ).filter(
              (p) =>
                !(existingOpenApi?.parameters || []).find(
                  (ep: any) => ep.name === p.name && ep.in === p.in
                )
            ),
          ],
          ...(!hasBodyValidation && {
            requestBody: existingOpenApi?.requestBody || {
              description: `Partial ${humanReadableName} data to update`,
              required: true,
              content: {
                "application/json": {
                  schema: prismaJsonSchemaGenerator.generateUpdateSchema(model),
                },
              },
            },
          }),
          responses: {
            ...(existingOpenApi?.responses || {}),
            "200": existingOpenApi?.responses?.["200"] || {
              description: `${humanReadableName} updated successfully`,
              content: {
                "application/json": {
                  schema: prismaJsonSchemaGenerator.generateResponseSchema(
                    model,
                    this.resolvePrismaQueryOptions(
                      prismaQueryOptions,
                      "updateOne"
                    )
                  ),
                },
              },
            },
            "400": existingOpenApi?.responses?.["400"] || {
              description: "Invalid input data provided",
            },
            ...authErrors,
            "404": existingOpenApi?.responses?.["404"] || {
              description: `${humanReadableName} not found`,
            },
          },
        };

      case "deleteOne":
        return {
          ...existingOpenApi,
          tags: [
            capitalize(humanReadableNamePlural),
            ...(existingOpenApi?.tags || []),
          ].filter((tag) => tag !== "Defaults"),
          summary:
            existingOpenApi?.summary || `Delete ${humanReadableName} by ID`,
          description:
            existingOpenApi?.description ||
            `Permanently deletes a single ${humanReadableName} record by its unique identifier`,
          operationId:
            existingOpenApi?.operationId || `delete${pascalModelName}`,
          security: existingOpenApi?.security || [{ BearerAuth: [] }],
          parameters: [
            ...(existingOpenApi?.parameters || []),
            ...(!hasParamsValidation
              ? ([
                  {
                    name: "id",
                    in: "path",
                    description: `Unique identifier of the ${humanReadableName}`,
                    required: true,
                    schema: { type: "string" },
                  },
                ] as any[])
              : []
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
              description: `${humanReadableName} deleted successfully`,
            },
            ...authErrors,
            "404": existingOpenApi?.responses?.["404"] || {
              description: `${humanReadableName} not found`,
            },
          },
        };

      default:
        return {};
    }
  }
}

const modelOpenAPIGenerator = new ModelOpenAPIGenerator();

export default modelOpenAPIGenerator;
