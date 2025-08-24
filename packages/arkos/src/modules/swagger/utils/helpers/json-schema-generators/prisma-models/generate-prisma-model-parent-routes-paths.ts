import { OpenAPIV3 } from "openapi-types";
import pluralize from "pluralize";
import { kebabCase, pascalCase } from "../../../../../../exports/utils";
import { getSchemaRef, kebabToHuman } from "../../swagger.router.helpers";
import { ArkosConfig } from "../../../../../../exports";
import { getModuleComponents } from "../../../../../../utils/dynamic-loader";
import { localValidatorFileExists } from "../../../../../../utils/dynamic-loader";

export default async function generatePrismaModelParentRoutesPaths(
  model: string,
  paths: OpenAPIV3.PathsObject,
  arkosConfig: ArkosConfig
) {
  const modelName = kebabCase(model);
  const routeName = pluralize.plural(modelName);
  const pascalModelName = pascalCase(model);
  const humanReadableName = kebabToHuman(modelName);
  const humanReadableNamePlural = pluralize.plural(humanReadableName);

  // Import model modules to get router config
  const ModuleComponents = getModuleComponents(model);
  const routerConfig = ModuleComponents?.router?.config;

  // Skip if router is completely disabled
  if (routerConfig?.disable === true) return;
  if (!routerConfig?.parent) return;

  const parentModel = routerConfig.parent.model;
  const parentRouteName = pluralize.plural(kebabCase(parentModel));
  const parentHumanName = kebabToHuman(kebabCase(parentModel));

  // Check if parent endpoint is allowed
  const isParentEndpointAllowed = (endpoint: string): boolean => {
    const parentEndpoints = routerConfig?.parent?.endpoints;

    // If endpoints is "*" or undefined, allow all
    if (!parentEndpoints || parentEndpoints === "*") return true;

    // If endpoints is array, check if endpoint is included
    if (Array.isArray(parentEndpoints))
      return parentEndpoints.includes(endpoint as any);

    return false;
  };

  // Helper function to determine the correct mode for schema ref
  const getSchemaMode = async (
    action: string
  ): Promise<"prisma" | "zod" | "class-validator"> => {
    const swaggerMode = arkosConfig.swagger?.mode;
    const isStrict = arkosConfig.swagger?.strict;

    if (isStrict) {
      return swaggerMode || "prisma";
    }

    const actionKey = action as any;
    const localFileExists = await localValidatorFileExists(
      actionKey,
      model,
      arkosConfig
    );

    if (!localFileExists) return "prisma";

    return swaggerMode || "prisma";
  };

  // Create One (Parent)
  if (isParentEndpointAllowed("createOne")) {
    const createMode = await getSchemaMode("create");
    paths[`/api/${parentRouteName}/{id}/${routeName}`] = {
      post: {
        tags: [humanReadableNamePlural],
        summary: `Create ${humanReadableName} for ${parentHumanName}`,
        description: `Creates a new ${humanReadableName} record associated with the specified ${parentHumanName}`,
        operationId: `create${pascalModelName}For${pascalCase(parentModel)}`,
        parameters: [
          {
            name: "id",
            in: "path",
            description: `Unique identifier of the ${parentHumanName}`,
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
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
          "201": {
            description: `${humanReadableName} created successfully`,
            content: {
              "application/json": {
                schema: {
                  $ref: getSchemaRef(`${pascalModelName}`, createMode),
                },
              },
            },
          },
          "400": {
            description: "Invalid input data provided",
          },
          "401": {
            description: "Authentication required",
          },
          "403": {
            description: "Insufficient permissions",
          },
          "404": {
            description: `${parentHumanName} not found`,
          },
        },
        security: [{ BearerAuth: [] }],
      },
    };
  }

  // Find Many (Parent)
  if (isParentEndpointAllowed("findMany")) {
    if (!paths[`/api/${parentRouteName}/{id}/${routeName}`])
      paths[`/api/${parentRouteName}/{id}/${routeName}`] = {};
    const findManyMode = await getSchemaMode("findMany");
    paths[`/api/${parentRouteName}/{id}/${routeName}`]!.get = {
      tags: [humanReadableNamePlural],
      summary: `Get ${humanReadableNamePlural} for ${parentHumanName}`,
      description: `Retrieves all ${humanReadableNamePlural} associated with the specified ${parentHumanName}`,
      operationId: `get${pluralize.plural(pascalModelName)}For${pascalCase(parentModel)}`,
      parameters: [
        {
          name: "id",
          in: "path",
          description: `Unique identifier of the ${parentHumanName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "filters",
          in: "query",
          description: "Additional filters criteria in JSON format",
          schema: {
            type: "string",
          },
        },
        {
          name: "sort",
          in: "query",
          description: "Sort field (prefix with '-' for descending order)",
          schema: {
            type: "string",
          },
        },
        {
          name: "page",
          in: "query",
          description: "Page number (starts from 1)",
          schema: {
            type: "integer",
            minimum: 1,
          },
        },
        {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
          },
        },
        {
          name: "fields",
          in: "query",
          description: "Comma-separated list of fields to include in response",
          schema: {
            type: "string",
          },
        },
      ],
      responses: {
        "200": {
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
        "401": {
          description: "Authentication required",
        },
        "403": {
          description: "Insufficient permissions",
        },
        "404": {
          description: `${parentHumanName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Create Many (Parent)
  if (isParentEndpointAllowed("createMany")) {
    const createManyMode = await getSchemaMode("createMany");
    paths[`/api/${parentRouteName}/{id}/${routeName}/many`] = {
      post: {
        tags: [humanReadableNamePlural],
        summary: `Create multiple ${humanReadableNamePlural} for ${parentHumanName}`,
        description: `Creates multiple ${humanReadableNamePlural} records associated with the specified ${parentHumanName}`,
        operationId: `createMany${pascalModelName}For${pascalCase(parentModel)}`,
        parameters: [
          {
            name: "id",
            in: "path",
            description: `Unique identifier of the ${parentHumanName}`,
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        requestBody: {
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
          "201": {
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
          "400": {
            description: "Invalid input data provided",
          },
          "401": {
            description: "Authentication required",
          },
          "403": {
            description: "Insufficient permissions",
          },
          "404": {
            description: `${parentHumanName} not found`,
          },
        },
        security: [{ BearerAuth: [] }],
      },
    };
  }

  // Update Many (Parent)
  if (isParentEndpointAllowed("updateMany")) {
    if (!paths[`/api/${parentRouteName}/{id}/${routeName}/many`])
      paths[`/api/${parentRouteName}/{id}/${routeName}/many`] = {};
    const updateManyMode = await getSchemaMode("updateMany");
    paths[`/api/${parentRouteName}/{id}/${routeName}/many`]!.patch = {
      tags: [humanReadableNamePlural],
      summary: `Update multiple ${humanReadableNamePlural} for ${parentHumanName}`,
      description: `Updates multiple ${humanReadableNamePlural} records associated with the specified ${parentHumanName}`,
      operationId: `updateMany${pascalModelName}For${pascalCase(parentModel)}`,
      parameters: [
        {
          name: "id",
          in: "path",
          description: `Unique identifier of the ${parentHumanName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "filters",
          in: "query",
          description: "Additional filters criteria in JSON format",
          schema: {
            type: "string",
          },
        },
      ],
      requestBody: {
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
        "200": {
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
        "400": {
          description: "Invalid input data provided",
        },
        "401": {
          description: "Authentication required",
        },
        "403": {
          description: "Insufficient permissions",
        },
        "404": {
          description: `${parentHumanName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Delete Many (Parent)
  if (isParentEndpointAllowed("deleteMany")) {
    if (!paths[`/api/${parentRouteName}/{id}/${routeName}/many`])
      paths[`/api/${parentRouteName}/{id}/${routeName}/many`] = {};
    paths[`/api/${parentRouteName}/{id}/${routeName}/many`]!.delete = {
      tags: [humanReadableNamePlural],
      summary: `Delete multiple ${humanReadableNamePlural} for ${parentHumanName}`,
      description: `Deletes multiple ${humanReadableNamePlural} records associated with the specified ${parentHumanName}`,
      operationId: `deleteMany${pascalModelName}For${pascalCase(parentModel)}`,
      parameters: [
        {
          name: "id",
          in: "path",
          description: `Unique identifier of the ${parentHumanName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "filters",
          in: "query",
          description: "Additional filters criteria in JSON format",
          schema: {
            type: "string",
          },
        },
      ],
      responses: {
        "200": {
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
        "400": {
          description: "Missing filter criteria",
        },
        "401": {
          description: "Authentication required",
        },
        "403": {
          description: "Insufficient permissions",
        },
        "404": {
          description: `${parentHumanName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Find One (Parent)
  if (isParentEndpointAllowed("findOne")) {
    const findOneMode = await getSchemaMode("findOne");
    paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`] = {
      get: {
        tags: [humanReadableNamePlural],
        summary: `Get ${humanReadableName} by ID for ${parentHumanName}`,
        description: `Retrieves a single ${humanReadableName} record by its unique identifier associated with the specified ${parentHumanName}`,
        operationId: `get${pascalModelName}ByIdFor${pascalCase(parentModel)}`,
        parameters: [
          {
            name: "id",
            in: "path",
            description: `Unique identifier of the ${parentHumanName}`,
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            name: "childId",
            in: "path",
            description: `Unique identifier of the ${humanReadableName}`,
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: `${humanReadableName} retrieved successfully`,
            content: {
              "application/json": {
                schema: {
                  $ref: getSchemaRef(`FindOne${pascalModelName}`, findOneMode),
                },
              },
            },
          },
          "401": {
            description: "Authentication required",
          },
          "403": {
            description: "Insufficient permissions",
          },
          "404": {
            description: `${humanReadableName} or ${parentHumanName} not found`,
          },
        },
        security: [{ BearerAuth: [] }],
      },
    };
  }

  // Update One (Parent)
  if (isParentEndpointAllowed("updateOne")) {
    if (!paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`])
      paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`] = {};
    const updateMode = await getSchemaMode("update");
    paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`]!.patch = {
      tags: [humanReadableNamePlural],
      summary: `Update ${humanReadableName} by ID for ${parentHumanName}`,
      description: `Updates a single ${humanReadableName} record by its unique identifier associated with the specified ${parentHumanName}`,
      operationId: `update${pascalModelName}ByIdFor${pascalCase(parentModel)}`,
      parameters: [
        {
          name: "id",
          in: "path",
          description: `Unique identifier of the ${parentHumanName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "childId",
          in: "path",
          description: `Unique identifier of the ${humanReadableName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      requestBody: {
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
        "200": {
          description: `${humanReadableName} updated successfully`,
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef(`${pascalModelName}`, updateMode),
              },
            },
          },
        },
        "400": {
          description: "Invalid input data provided",
        },
        "401": {
          description: "Authentication required",
        },
        "403": {
          description: "Insufficient permissions",
        },
        "404": {
          description: `${humanReadableName} or ${parentHumanName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Delete One (Parent)
  if (isParentEndpointAllowed("deleteOne")) {
    if (!paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`])
      paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`] = {};
    paths[`/api/${parentRouteName}/{id}/${routeName}/{childId}`]!.delete = {
      tags: [humanReadableNamePlural],
      summary: `Delete ${humanReadableName} by ID for ${parentHumanName}`,
      description: `Permanently deletes a single ${humanReadableName} record by its unique identifier associated with the specified ${parentHumanName}`,
      operationId: `delete${pascalModelName}ByIdFor${pascalCase(parentModel)}`,
      parameters: [
        {
          name: "id",
          in: "path",
          description: `Unique identifier of the ${parentHumanName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
        {
          name: "childId",
          in: "path",
          description: `Unique identifier of the ${humanReadableName}`,
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      responses: {
        "204": {
          description: `${humanReadableName} deleted successfully`,
        },
        "401": {
          description: "Authentication required",
        },
        "403": {
          description: "Insufficient permissions",
        },
        "404": {
          description: `${humanReadableName} or ${parentHumanName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }
}
