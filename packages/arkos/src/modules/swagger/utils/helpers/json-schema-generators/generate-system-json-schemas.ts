import { ArkosConfig } from "../../../../../exports";

export default function generateSystemJsonSchemas(arkosConfig: ArkosConfig): {
  FindManyAuthActionSystemSchema: any;
} {
  const isDynamicMode = arkosConfig?.authentication?.mode === "dynamic";

  const baseProperties: Record<string, any> = {
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

  // Only include roles if not in dynamic mode
  if (!isDynamicMode) {
    baseProperties.roles = {
      type: "array",
      description: "Role names that have this permission, e.g Admin, Manager",
      items: {
        type: "string",
      },
    };
  }

  return {
    FindManyAuthActionSystemSchema: {
      type: "object",
      properties: baseProperties,
      required: ["action", "resource"],
      additionalProperties: false,
    },
  };
}
