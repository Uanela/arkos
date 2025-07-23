import { OpenAPIV3 } from "openapi-types";
import pluralize from "pluralize";
import { kebabCase, pascalCase } from "../../../../../../exports/utils";
import { getSchemaRef, kebabToHuman } from "../../swagger.router.helpers";
import { isParentEndpointAllowed } from "../../../../../base/utils/helpers/base.router.helpers";

export async function generatePrismaModelParentRoutePaths(
  paths: OpenAPIV3.PathsObject,
  routeName: string,
  pascalModelName: string,
  humanReadableName: string,
  humanReadableNamePlural: string,
  routerConfig: any,
  mode: string
) {
  const parentModel = routerConfig.parent.model;
  const parentRouteName = pluralize.plural(kebabCase(parentModel));
  const parentHumanName = kebabToHuman(kebabCase(parentModel));
  // const foreignKeyField =
  //   routerConfig.parent.foreignKeyField || `${kebabCase(parentModel)}Id`;

  // Create One (Parent)
  if (isParentEndpointAllowed(routerConfig, "createOne")) {
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
                $ref: getSchemaRef(`Create${pascalModelName}`, mode),
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
                  $ref: getSchemaRef(`${pascalModelName}`, mode),
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
  if (isParentEndpointAllowed(routerConfig, "findMany")) {
    if (!paths[`/api/${parentRouteName}/{id}/${routeName}`])
      paths[`/api/${parentRouteName}/{id}/${routeName}`] = {};
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
          name: "filter",
          in: "query",
          description: "Additional filter criteria in JSON format",
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
                    description: "Total number of records",
                  },
                  results: {
                    type: "integer",
                    description: "Number of records in current page",
                  },
                  data: {
                    type: "array",
                    items: {
                      $ref: getSchemaRef(`${pascalModelName}`, mode),
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

  // Add other parent endpoints (findOne, updateOne, deleteOne, etc.) following the same pattern...
}
