import { OpenAPIV3 } from "openapi-types";
import {
  getSchemaRef,
  kebabToHuman,
  localValidatorFileExists,
} from "../../swagger.router.helpers";
import pluralize from "pluralize";
import { isEndpointDisabled } from "../../../../../base/utils/helpers/base.router.helpers";
import { ArkosConfig, RouterConfig } from "../../../../../../exports";
import { kebabCase, pascalCase } from "../../../../../../exports/utils";
import { getModuleComponents } from "../../../../../../utils/dynamic-loader";
import { isAuthenticationEnabled } from "../../../../../../utils/helpers/arkos-config.helpers";

function getAuthErrorResponses(): Record<string, any> {
  if (!isAuthenticationEnabled()) return {};

  return {
    "401": { description: "Authentication required" },
    "403": { description: "Insufficient permissions" },
  };
}

export function generatePrismaModelMainRoutesPaths(
  model: string,
  paths: OpenAPIV3.PathsObject = {},
  arkosConfig: ArkosConfig
) {
  const modelName = kebabCase(model);
  const routeName = pluralize.plural(modelName);
  const pascalModelName = pascalCase(model);
  const humanReadableName = kebabToHuman(modelName);
  const humanReadableNamePlural = pluralize.plural(humanReadableName);

  const moduleComponents = getModuleComponents(model);
  const routerConfig = moduleComponents?.router
    ?.config as RouterConfig<"prisma">;

  if (routerConfig?.disable === true) return paths;

  const getSchemaMode = (
    action: string
  ): "prisma" | "zod" | "class-validator" => {
    const swaggerMode = arkosConfig.swagger?.mode;
    const isStrict = arkosConfig.swagger?.strict;

    if (isStrict) return swaggerMode || "prisma";

    const actionKey = action as any;

    const localFileExists = localValidatorFileExists(
      actionKey,
      model,
      arkosConfig
    );

    if (!localFileExists) return "prisma";

    return swaggerMode || "prisma";
  };

  // Create One
  if (!isEndpointDisabled(routerConfig, "createOne")) {
    const pathname = `/api/${routeName}`;
    if (!paths[pathname]) paths[pathname] = {};
    const createMode = getSchemaMode("create");
    const currentPath = paths[pathname]!.post;

    const defaultSpec = {
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Create a new ${humanReadableName}`
          : currentPath?.summary,
      description: `Creates a new ${humanReadableName} record in the system`,
      operationId: `create${pascalModelName}`,
      requestBody: currentPath?.requestBody || {
        description: `${humanReadableName} data to create`,
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef(`Create${pascalModelName}`, createMode),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "201": currentPath?.responses?.["201"] || {
          description: `${humanReadableName} created successfully`,
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef(`${pascalModelName}`, createMode),
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data provided",
        },
        ...getAuthErrorResponses(),
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.post = { ...(currentPath || {}), ...defaultSpec };
  }

  // Find Many
  if (!isEndpointDisabled(routerConfig, "findMany")) {
    const pathname = `/api/${routeName}`;
    if (!paths[pathname]) paths[pathname] = {};
    const findManyMode = getSchemaMode("findMany");
    const currentPath = paths[pathname]!.get;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "filters",
        in: "query",
        description: "Filter criteria in JSON format",
        schema: { type: "string" },
      },
      {
        name: "sort",
        in: "query",
        description: "Sort field (prefix with '-' for descending order)",
        schema: { type: "string" },
      },
      {
        name: "page",
        in: "query",
        description: "Page number (starts from 1)",
        schema: { type: "integer", minimum: 1 },
      },
      {
        name: "limit",
        in: "query",
        description: "Number of items per page",
        schema: { type: "integer", minimum: 1, maximum: 100 },
      },
      {
        name: "fields",
        in: "query",
        description: "Comma-separated list of fields to include in response",
        schema: { type: "string" },
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
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Get ${humanReadableNamePlural}`
          : currentPath?.summary,
      description: `Retrieves a paginated list of ${humanReadableNamePlural} with optional filtering and sorting`,
      operationId: `find${pluralize.plural(pascalModelName)}`,
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
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
                    description: "Number of records returned in current page",
                  },
                  data: {
                    type: "array",
                    items: {
                      $ref: getSchemaRef(
                        `FindMany${pascalModelName}`,
                        findManyMode
                      ),
                    },
                  },
                },
              },
            },
          },
        },
        ...getAuthErrorResponses(),
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.get = { ...(currentPath || {}), ...defaultSpec };
  }

  // Create Many
  if (!isEndpointDisabled(routerConfig, "createMany")) {
    const pathname = `/api/${routeName}/many`;
    if (!paths[pathname]) paths[pathname] = {};
    const createManyMode = getSchemaMode("createMany");
    const currentPath = paths[pathname]!.post;

    const defaultSpec = {
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Create multiple ${humanReadableNamePlural}`
          : currentPath?.summary,
      description: `Creates multiple ${humanReadableNamePlural} records in a single batch operation`,
      operationId: `createMany${pascalModelName}`,
      requestBody: currentPath?.requestBody || {
        description: `Array of ${humanReadableName} data to create`,
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                $ref: getSchemaRef(
                  `CreateMany${pascalModelName}`,
                  createManyMode
                ),
              },
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "201": currentPath?.responses?.["201"] || {
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
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data provided",
        },
        ...getAuthErrorResponses(),
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.post = { ...(currentPath || {}), ...defaultSpec };
  }

  // Update Many
  if (!isEndpointDisabled(routerConfig, "updateMany")) {
    const pathname = `/api/${routeName}/many`;
    if (!paths[pathname]) paths[pathname] = {};
    const updateManyMode = getSchemaMode("updateMany");
    const currentPath = paths[pathname]!.patch;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "filters",
        in: "query",
        description: "Filter criteria in JSON format (required)",
        required: true,
        schema: { type: "string" },
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
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Update multiple ${humanReadableNamePlural}`
          : currentPath?.summary,
      description: `Updates multiple ${humanReadableNamePlural} records that match the specified filter criteria`,
      operationId: `updateMany${pascalModelName}`,
      parameters: mergedParameters,
      requestBody: currentPath?.requestBody || {
        description: `Partial ${humanReadableName} data to update`,
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef(
                `UpdateMany${pascalModelName}`,
                updateManyMode
              ),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
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
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data or missing filter criteria",
        },
        ...getAuthErrorResponses(),
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.patch = { ...(currentPath || {}), ...defaultSpec };
  }

  // Delete Many
  if (!isEndpointDisabled(routerConfig, "deleteMany")) {
    const pathname = `/api/${routeName}/many`;
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.delete;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "filters",
        in: "query",
        description: "Filter criteria in JSON format (required)",
        required: true,
        schema: { type: "string" },
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
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Delete multiple ${humanReadableNamePlural}`
          : currentPath?.summary,
      description: `Deletes multiple ${humanReadableNamePlural} records that match the specified filter criteria`,
      operationId: `deleteMany${pascalModelName}`,
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
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
        "400": currentPath?.responses?.["400"] || {
          description: "Missing filter criteria",
        },
        ...getAuthErrorResponses(),
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.delete = { ...(currentPath || {}), ...defaultSpec };
  }

  // Find One
  if (!isEndpointDisabled(routerConfig, "findOne")) {
    const pathname = `/api/${routeName}/{id}`;
    if (!paths[pathname]) paths[pathname] = {};
    const findOneMode = getSchemaMode("findOne");
    const currentPath = paths[pathname]!.get;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "id",
        in: "path",
        description: `Unique identifier of the ${humanReadableName}`,
        required: true,
        schema: { type: "string" },
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
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Get ${humanReadableName} by ID`
          : currentPath?.summary,
      description: `Retrieves a single ${humanReadableName} record by its unique identifier`,
      operationId: `find${pascalModelName}ById`,
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: `${humanReadableName} retrieved successfully`,
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef(`FindOne${pascalModelName}`, findOneMode),
              },
            },
          },
        },
        ...getAuthErrorResponses(),
        "404": currentPath?.responses?.["404"] || {
          description: `${humanReadableName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.get = { ...(currentPath || {}), ...defaultSpec };
  }

  // Update One
  if (!isEndpointDisabled(routerConfig, "updateOne")) {
    const pathname = `/api/${routeName}/{id}`;
    if (!paths[pathname]) paths[pathname] = {};
    const updateMode = getSchemaMode("update");
    const currentPath = paths[pathname]!.patch;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "id",
        in: "path",
        description: `Unique identifier of the ${humanReadableName}`,
        required: true,
        schema: { type: "string" },
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
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Update ${humanReadableName} by ID`
          : currentPath?.summary,
      description: `Updates a single ${humanReadableName} record by its unique identifier`,
      operationId: `update${pascalModelName}`,
      parameters: mergedParameters,
      requestBody: currentPath?.requestBody || {
        description: `Partial ${humanReadableName} data to update`,
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef(`Update${pascalModelName}`, updateMode),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: `${humanReadableName} updated successfully`,
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef(`${pascalModelName}`, updateMode),
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data provided",
        },
        ...getAuthErrorResponses(),
        "404": currentPath?.responses?.["404"] || {
          description: `${humanReadableName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.patch = { ...(currentPath || {}), ...defaultSpec };
  }

  // Delete One
  if (!isEndpointDisabled(routerConfig, "deleteOne")) {
    const pathname = `/api/${routeName}/{id}`;
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.delete;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "id",
        in: "path",
        description: `Unique identifier of the ${humanReadableName}`,
        required: true,
        schema: { type: "string" },
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
      tags: [humanReadableNamePlural, ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? `Delete ${humanReadableName} by ID`
          : currentPath?.summary,
      description: `Permanently deletes a single ${humanReadableName} record by its unique identifier`,
      operationId: `delete${pascalModelName}`,
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "204": currentPath?.responses?.["204"] || {
          description: `${humanReadableName} deleted successfully`,
        },
        ...getAuthErrorResponses(),
        "404": currentPath?.responses?.["404"] || {
          description: `${humanReadableName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };

    paths[pathname]!.delete = { ...(currentPath || {}), ...defaultSpec };
  }

  return paths;
}
