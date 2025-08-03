import { OpenAPIV3 } from "openapi-types";
import { getSchemaRef, kebabToHuman } from "../../swagger.router.helpers";
import pluralize from "pluralize";
import { isEndpointDisabled } from "../../../../../base/utils/helpers/base.router.helpers";
import { ArkosConfig } from "../../../../../../exports";
import { kebabCase, pascalCase } from "../../../../../../exports/utils";
import {
  importPrismaModelModules,
  localValidatorFileExists,
} from "../../../../../../utils/helpers/models.helpers";

export async function generatePrismaModelMainRoutesPaths(
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
  const modelModules = await importPrismaModelModules(model, arkosConfig);
  const routerConfig = modelModules?.router?.config;

  // Skip if router is completely disabled
  if (routerConfig?.disable === true) return;

  // Helper function to determine the correct mode for schema ref
  const getSchemaMode = async (
    action: string
  ): Promise<"prisma" | "zod" | "class-validator"> => {
    const swaggerMode = arkosConfig.swagger?.mode;
    const isStrict = arkosConfig.swagger?.strict;

    if (isStrict) {
      return swaggerMode || "prisma";
    }

    // Convert action to ValidationFileMappingKey format if needed
    const actionKey = action as any; // You may need to convert this based on the key mappings

    const localFileExists = await localValidatorFileExists(
      actionKey,
      model,
      arkosConfig
    );

    if (!localFileExists) {
      return "prisma"; // Fallback to prisma when no local file exists and not strict
    }

    return swaggerMode || "prisma";
  };

  // Create One
  if (!isEndpointDisabled(routerConfig, "createOne")) {
    if (!paths[`/api/${routeName}`]) paths[`/api/${routeName}`] = {};
    const createMode = await getSchemaMode("create");
    paths[`/api/${routeName}`]!.post = {
      tags: [humanReadableNamePlural],
      summary: `Create a new ${humanReadableName}`,
      description: `Creates a new ${humanReadableName} record in the system`,
      operationId: `create${pascalModelName}`,
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
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Find Many
  if (!isEndpointDisabled(routerConfig, "findMany")) {
    if (!paths[`/api/${routeName}`]) paths[`/api/${routeName}`] = {};
    const findManyMode = await getSchemaMode("findMany");
    paths[`/api/${routeName}`]!.get = {
      tags: [humanReadableNamePlural],
      summary: `Get ${humanReadableNamePlural}`,
      description: `Retrieves a paginated list of ${humanReadableNamePlural} with optional filtering and sorting`,
      operationId: `get${pluralize.plural(pascalModelName)}`,
      parameters: [
        {
          name: "filter",
          in: "query",
          description: "Filter criteria in JSON format",
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
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Create Many
  if (!isEndpointDisabled(routerConfig, "createMany")) {
    const createManyMode = await getSchemaMode("createMany");
    paths[`/api/${routeName}/many`] = {
      post: {
        tags: [humanReadableNamePlural],
        summary: `Create multiple ${humanReadableNamePlural}`,
        description: `Creates multiple ${humanReadableNamePlural} records in a single batch operation`,
        operationId: `createMany${pascalModelName}`,
        requestBody: {
          description: `Array of ${humanReadableName} data to create`,
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  $ref: getSchemaRef(
                    `Create${pascalModelName}`,
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
        },
        security: [{ BearerAuth: [] }],
      },
    };
  }

  // Update Many
  if (!isEndpointDisabled(routerConfig, "updateMany")) {
    if (!paths[`/api/${routeName}/many`]) paths[`/api/${routeName}/many`] = {};
    const updateManyMode = await getSchemaMode("updateMany");
    paths[`/api/${routeName}/many`]!.patch = {
      tags: [humanReadableNamePlural],
      summary: `Update multiple ${humanReadableNamePlural}`,
      description: `Updates multiple ${humanReadableNamePlural} records that match the specified filter criteria`,
      operationId: `updateMany${pascalModelName}`,
      parameters: [
        {
          name: "filter",
          in: "query",
          description: "Filter criteria in JSON format (required)",
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
              $ref: getSchemaRef(`Update${pascalModelName}`, updateManyMode),
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
          description: "Invalid input data or missing filter criteria",
        },
        "401": {
          description: "Authentication required",
        },
        "403": {
          description: "Insufficient permissions",
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Delete Many
  if (!isEndpointDisabled(routerConfig, "deleteMany")) {
    if (!paths[`/api/${routeName}/many`]) paths[`/api/${routeName}/many`] = {};
    paths[`/api/${routeName}/many`]!.delete = {
      tags: [humanReadableNamePlural],
      summary: `Delete multiple ${humanReadableNamePlural}`,
      description: `Deletes multiple ${humanReadableNamePlural} records that match the specified filter criteria`,
      operationId: `deleteMany${pascalModelName}`,
      parameters: [
        {
          name: "filter",
          in: "query",
          description: "Filter criteria in JSON format (required)",
          required: true,
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
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Find One
  if (!isEndpointDisabled(routerConfig, "findOne")) {
    const findOneMode = await getSchemaMode("findOne");
    paths[`/api/${routeName}/{id}`] = {
      get: {
        tags: [humanReadableNamePlural],
        summary: `Get ${humanReadableName} by ID`,
        description: `Retrieves a single ${humanReadableName} record by its unique identifier`,
        operationId: `get${pascalModelName}ById`,
        parameters: [
          {
            name: "id",
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
            description: `${humanReadableName} not found`,
          },
        },
        security: [{ BearerAuth: [] }],
      },
    };
  }

  // Update One
  if (!isEndpointDisabled(routerConfig, "updateOne")) {
    if (!paths[`/api/${routeName}/{id}`]) paths[`/api/${routeName}/{id}`] = {};
    const updateMode = await getSchemaMode("update");
    paths[`/api/${routeName}/{id}`]!.patch = {
      tags: [humanReadableNamePlural],
      summary: `Update ${humanReadableName} by ID`,
      description: `Updates a single ${humanReadableName} record by its unique identifier`,
      operationId: `update${pascalModelName}`,
      parameters: [
        {
          name: "id",
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
          description: `${humanReadableName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }

  // Delete One
  if (!isEndpointDisabled(routerConfig, "deleteOne")) {
    if (!paths[`/api/${routeName}/{id}`]) paths[`/api/${routeName}/{id}`] = {};
    paths[`/api/${routeName}/{id}`]!.delete = {
      tags: [humanReadableNamePlural],
      summary: `Delete ${humanReadableName} by ID`,
      description: `Permanently deletes a single ${humanReadableName} record by its unique identifier`,
      operationId: `delete${pascalModelName}`,
      parameters: [
        {
          name: "id",
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
          description: `${humanReadableName} not found`,
        },
      },
      security: [{ BearerAuth: [] }],
    };
  }
}
