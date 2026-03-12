import { OpenAPIV3 } from "openapi-types";
import { getSchemaRef, kebabToHuman } from "../../swagger.router.helpers";
import pluralize from "pluralize";
import { kebabCase, pascalCase } from "../../../../../../exports/utils";
import { isAuthenticationEnabled } from "../../../../../../utils/helpers/arkos-config.helpers";
import {
  OperationByModule,
  routeHookReader,
} from "../../../../../../components/arkos-route-hook/reader";
import { getInputSchemaMode } from "../../get-authentication-json-schema-paths";

function getAuthErrorResponses(): Record<string, any> {
  if (!isAuthenticationEnabled()) return {};

  return {
    "401": { description: "Authentication required" },
    "403": { description: "Insufficient permissions" },
  };
}

export function generatePrismaModelMainRoutesPaths(
  model: string,
  paths: OpenAPIV3.PathsObject = {}
) {
  const modelName = kebabCase(model);
  const routeName = pluralize.plural(modelName);
  const pascalModelName = pascalCase(model);
  const humanReadableName = kebabToHuman(modelName);
  const humanReadableNamePlural = pluralize.plural(humanReadableName);

  const isEndpointDisabled = (endpoint: OperationByModule<"">): boolean => {
    return !!routeHookReader.getRouteConfig("", endpoint)?.disabled;
  };

  // Create One
  if (!isEndpointDisabled("createOne")) {
    const pathname = `/api/${routeName}`;
    if (!paths[pathname]) paths[pathname] = {};
    const createMode = getInputSchemaMode("", "createOne");
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
  if (!isEndpointDisabled("findMany")) {
    const pathname = `/api/${routeName}`;
    if (!paths[pathname]) paths[pathname] = {};
    const findManyMode = getInputSchemaMode("", "findMany");
    const currentPath = paths[pathname]!.get;

    const defaultParameters: OpenAPIV3.ParameterObject[] =
      ((currentPath?.parameters?.length || 0) > 0 &&
        currentPath?.parameters?.every(
          (parameter: any) => parameter?.in === "path"
        )) ||
      !currentPath?.parameters ||
      (currentPath?.parameters?.length || 0) === 0
        ? [
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
              name: "search",
              in: "query",
              description: "Searches in string fields of model",
              schema: { type: "string" },
            },
            {
              name: "fields",
              in: "query",
              description:
                "Comma-separated list of fields to include in response",
              schema: { type: "string" },
            },
            {
              name: "sort",
              in: "query",
              description: "Sort field (prefix with '-' for descending order)",
              schema: { type: "string" },
            },
          ]
        : [];

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
  if (!isEndpointDisabled("createMany")) {
    const pathname = `/api/${routeName}/many`;
    if (!paths[pathname]) paths[pathname] = {};
    const createManyMode = getInputSchemaMode("", "createMany");
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
  if (!isEndpointDisabled("updateMany")) {
    const pathname = `/api/${routeName}/many`;
    if (!paths[pathname]) paths[pathname] = {};
    const updateManyMode = getInputSchemaMode("", "updateMany");
    const currentPath = paths[pathname]!.patch;

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
  if (!isEndpointDisabled("deleteMany")) {
    const pathname = `/api/${routeName}/many`;
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.delete;

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
  if (!isEndpointDisabled("findOne")) {
    const pathname = `/api/${routeName}/{id}`;
    if (!paths[pathname]) paths[pathname] = {};
    const findOneMode = getInputSchemaMode("", "findOne");
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
  if (!isEndpointDisabled("updateOne")) {
    const pathname = `/api/${routeName}/{id}`;
    if (!paths[pathname]) paths[pathname] = {};
    const updateMode = getInputSchemaMode("", "updateOne");
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
  if (!isEndpointDisabled("deleteOne")) {
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
