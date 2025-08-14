import { OpenAPIV3 } from "openapi-types";

export function getSystemJsonSchemaPaths() {
  const paths: OpenAPIV3.PathsObject = {};

  paths["/api/available-resources"] = {
    get: {
      tags: ["System"],
      summary: "Get available resources",
      description:
        "Returns a comprehensive list of all available API resource endpoints",
      operationId: "getAvailableResources",
      responses: {
        "200": {
          description: "List of available resources retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description: "Array of available resource endpoints",
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return paths;
}
