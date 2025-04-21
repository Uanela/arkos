// import { kebabCase } from "change-case";
import { kebabCase } from "../src/utils/helpers/change-case.helpers";
import fs from "fs";
import path from "path";
import pluralize from "pluralize";
// import DtoParser from "./dto-parser";
import { getAppRoutes } from "../src/utils/helpers/base.controller.helpers";

// Define types for the routes and collection
interface Route {
  method: string;
  path: string;
}

interface InsomniaResource {
  _id: string;
  parentId: string | null;
  modified: string;
  created: string;
  name: string;
  description?: string;
  _type: string;
  url?: string;
  method?: string;
  body?: {
    mimeType?: string;
    text?: string;
  };
  parameters?: Array<{
    id: string;
    name: string;
    value: string;
    description: string;
    disabled: boolean;
  }>;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  authentication?: Record<string, unknown>;
  metaSortKey?: number;
  environment?: Record<string, unknown>;
  environmentPropertyOrder?: null;
  isPrivate?: boolean;
  settingStoreCookies?: boolean;
  settingSendCookies?: boolean;
  settingDisableRenderRequestBody?: boolean;
  settingEncodeUrl?: boolean;
  settingRebuildPath?: boolean;
  settingFollowRedirects?: string;
}

interface InsomniaCollection {
  _type: string;
  __export_format: number;
  __export_date: string;
  __export_source: string;
  resources: InsomniaResource[];
}

interface ResourceRoutes {
  findMany?: Route;
  findOne?: Route;
  createOne?: Route;
  createMany?: Route;
  updateOne?: Route;
  updateMany?: Route;
  deleteOne?: Route;
  deleteMany?: Route;
}

function generateInsomniaCollection(): InsomniaCollection {
  const routes = getAppRoutes();

  // Unique resource types
  const resourceTypes: string[] = [
    ...new Set(
      routes
        .filter(
          (route) =>
            !route.path.endsWith(":/id") || !route.path.endsWith("/many")
        )
        .map((route) => route.path.split("/api/")[1] || "root")
    ),
  ];

  // Base collection structure
  const collection: InsomniaCollection = {
    _type: "export",
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: "script-generated",
    resources: [],
  };

  // Add workspace
  collection.resources.push({
    _id: "wrk_arkos",
    parentId: null,
    modified: new Date().toISOString(),
    created: new Date().toISOString(),
    name: "Project API",
    description: "Automatically generated Arkos API collection",
    _type: "workspace",
  });

  // Group routes by resource type
  const routesByResource: Record<string, ResourceRoutes> = resourceTypes.reduce(
    (acc, resourceType) => {
      if (resourceType === "root") return acc;

      acc[resourceType] = {
        findMany: routes.find(
          (r) => r.method === "GET" && r.path === `/${resourceType}`
        ),
        findOne: routes.find(
          (r) => r.method === "GET" && r.path === `/${resourceType}/:id`
        ),
        createOne: routes.find(
          (r) => r.method === "POST" && r.path === `/${resourceType}`
        ),
        createMany: routes.find(
          (r) => r.method === "POST" && r.path === `/${resourceType}/many`
        ),
        updateOne: routes.find(
          (r) => r.method === "PATCH" && r.path === `/${resourceType}/:id`
        ),
        updateMany: routes.find(
          (r) => r.method === "PATCH" && r.path === `/${resourceType}/many`
        ),
        deleteOne: routes.find(
          (r) => r.method === "DELETE" && r.path === `/${resourceType}/:id`
        ),
        deleteMany: routes.find(
          (r) => r.method === "DELETE" && r.path === `/${resourceType}/many`
        ),
      };

      return acc;
    },
    {} as Record<string, any>
  );

  // Create folders and requests for each resource type
  Object.entries(routesByResource).forEach(
    ([resourceType, resourceRoutes], index) => {
      // Main resource folder
      const folderId = `fld_${resourceType}`;
      collection.resources.push({
        _id: folderId,
        parentId: "wrk_arkos",
        modified: new Date().toISOString(),
        created: new Date().toISOString(),
        name: resourceType
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        description: `${resourceType
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())} endpoints`,
        environment: {},
        environmentPropertyOrder: null,
        metaSortKey: -1000 + index * 100,
        _type: "request_group",
      });

      // Create specific method requests
      const methodMappings = [
        { key: "findMany", name: "Find Many", method: "GET" },
        { key: "findOne", name: "Find One", method: "GET" },
        { key: "createOne", name: "Create One", method: "POST" },
        { key: "createMany", name: "Create Many", method: "POST" },
        { key: "updateOne", name: "Update One", method: "PATCH" },
        { key: "updateMany", name: "Update Many", method: "PATCH" },
        { key: "deleteOne", name: "Delete One", method: "DELETE" },
        { key: "deleteMany", name: "Delete Many", method: "DELETE" },
      ];

      methodMappings.forEach(async (mapping, routeIndex) => {
        const route = resourceRoutes[mapping.key as keyof ResourceRoutes];
        if (!route) return;

        const modelName = kebabCase(pluralize.singular(mapping.key));
        const reqId = `req_${resourceType}_${mapping.key}`;
        // const dtoPath = path.join(
        //   process.cwd(),
        //   `src/modules/${modelName}/dtos`
        // );

        // const dotMapping: Record<string, string> = {
        //   createOne: `create-${modelName}.dto.ts`,
        //   updateOne: `create-${modelName}.dto.ts`,
        // };

        // const dto = await import(path.join(dtoPath, dotMapping[mapping.key]));

        collection.resources.push({
          _id: reqId,
          parentId: folderId,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          url: `{{BASE_URL}}/${route.path}`,
          name: mapping.name,
          description: `${mapping.method} request for ${route.path}`,
          method: route.method,
          body:
            route.method !== "GET"
              ? {
                  mimeType: "application/json",
                  text:
                    route.method === "POST" || route.method === "PATCH"
                      ? route.path.includes?.("/many")
                        ? "[{}]" // array for many
                        : "{}" // object for single
                      : "[]", // array for delete
                }
              : {},
          parameters: route.path.includes?.(":")
            ? route.path
                .split("/")
                .filter((p) => p.startsWith(":"))
                .map((param) => ({
                  id: `par_${param.slice(1)}`,
                  name: param.slice(1),
                  value: "",
                  description: `${param.slice(1)} parameter`,
                  disabled: false,
                }))
            : [],
          headers:
            route.method !== "GET"
              ? [
                  {
                    name: "Content-Type",
                    value: "application/json",
                  },
                ]
              : [],
          authentication: {},
          metaSortKey: -1000 + routeIndex * 10,
          isPrivate: false,
          settingStoreCookies: true,
          settingSendCookies: true,
          settingDisableRenderRequestBody: false,
          settingEncodeUrl: true,
          settingRebuildPath: true,
          settingFollowRedirects: "global",
          _type: "request",
        });
      });
    }
  );

  // Add root routes (api, available-routes)
  const rootFolderId = "fld_root";
  collection.resources.push({
    _id: rootFolderId,
    parentId: "wrk_arkos",
    modified: new Date().toISOString(),
    created: new Date().toISOString(),
    name: "Root",
    description: "Root API endpoints",
    environment: {},
    environmentPropertyOrder: null,
    metaSortKey: -100,
    _type: "request_group",
  });

  const rootRoutes = routes.filter(
    (route) => route.path === "/api" || route.path === "/available-routes"
  );
  rootRoutes.forEach((route, index) => {
    collection.resources.push({
      _id: `req_root_${route.path.slice(1)}`,
      parentId: rootFolderId,
      modified: new Date().toISOString(),
      created: new Date().toISOString(),
      url: `{{BASE_URL}}/${route.path}`,
      name: route.path === "/api" ? "Welcome" : "Available Routes",
      description: `${route.method} request for ${route.path}`,
      method: route.method,
      body: {},
      parameters: [],
      headers: [],
      authentication: {},
      metaSortKey: -1000 + index * 10,
      isPrivate: false,
      settingStoreCookies: true,
      settingSendCookies: true,
      settingDisableRenderRequestBody: false,
      settingEncodeUrl: true,
      settingRebuildPath: true,
      settingFollowRedirects: "global",
      _type: "request",
    });
  });

  return collection;
}

// Example usage
export function writeInsomniaCollectionJson() {
  // Generate the collection
  // const dtoParser = new DtoParser("./src/modules");
  // const dtoBodies = dtoParser.parseAllDtos();

  const insomniaCollection = generateInsomniaCollection();

  // Write to file
  fs.writeFileSync(
    path.join(process.cwd(), ".cache", "insomnia-collection.json"),
    JSON.stringify(insomniaCollection, null, 2)
  );

  console.log(
    "Insomnia collection generated successfully! .cache/insomnia-collection.json"
  );
}

writeInsomniaCollectionJson();
