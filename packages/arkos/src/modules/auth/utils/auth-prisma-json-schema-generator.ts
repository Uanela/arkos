import { OpenAPIV3 } from "openapi-types";
import { getArkosConfig } from "../../../utils/helpers/arkos-config.helpers";
import {
  JsonSchema,
  JsonSchemaProperty,
  PrismaModel,
} from "../../../utils/prisma/types";
import {
  AuthPrismaQueryOptions,
  prismaSchemaParser,
} from "../../../exports/prisma";
import prismaJsonSchemaGenerator from "../../../utils/prisma/prisma-json-schema-generator";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";

class AuthPrismaJsonSchemaGenerator {
  private userModel?: PrismaModel;

  private getUserModel() {
    if (!this.userModel)
      this.userModel = prismaSchemaParser.models.find(
        (m) => m.name.toLowerCase() === "user"
      );

    return this.userModel!;
  }

  private getPrismaArgs(endpoint: keyof AuthPrismaQueryOptions<any>) {
    return routeHookReader.getPrismaArgs("auth", endpoint) || {};
  }

  generateGetMeResponse(): JsonSchema {
    return prismaJsonSchemaGenerator.generateResponseSchema(
      this.getUserModel(),
      this.getPrismaArgs("getMe")
    );
  }

  generateUpdatePasswordSchema(): JsonSchema {
    return {
      type: "object",
      properties: {
        currentPassword: { type: "string" },
        newPassword: { type: "string", minLength: 8 },
      },
      required: ["currentPassword", "newPassword"],
    };
  }

  generateUpdateMeSchema(): JsonSchema {
    const updateSchema = prismaJsonSchemaGenerator.generateUpdateSchema(
      this.getUserModel()
    );

    // Remove sensitive fields that users shouldn't update themselves
    const restrictedFields = [
      "roles",
      "role",
      "isActive",
      "isStaff",
      "isSuperUser",
      "passwordChangedAt",
      "deletedSelfAccountAt",
      "password",
      "lastLoginAt",
    ];
    restrictedFields.forEach((field) => {
      delete updateSchema?.properties?.[field];
    });

    return updateSchema;
  }

  generateSignupSchema(): JsonSchema {
    const singupSchema = prismaJsonSchemaGenerator.generateCreateSchema(
      this.getUserModel()
    );

    const restrictedFields = [
      "roles",
      "role",
      "isActive",
      "isStaff",
      "isSuperUser",
      "passwordChangedAt",
      "deletedSelfAccountAt",
      "lastLoginAt",
    ];
    restrictedFields.forEach((field) => {
      delete singupSchema?.properties?.[field];
    });

    return singupSchema;
  }

  generateLoginSchema(): JsonSchema {
    const allowedUsernames = getArkosConfig()?.authentication?.login
      ?.allowedUsernames || ["username"];

    const usernameProperties: Record<string, OpenAPIV3.SchemaObject> = {};

    allowedUsernames.forEach((field: string) => {
      const displayName = field.includes(".") ? field.split(".").pop()! : field;
      usernameProperties[displayName] = {
        type: "string",
        description: `Username field: ${field}`,
      };
    });

    const baseSchema: JsonSchemaProperty = {
      type: "object",
      properties: {
        ...usernameProperties,
        password: {
          type: "string",
          minLength: 8,
        },
      },
      required: ["password"],
    };

    return {
      ...baseSchema,
      ...(allowedUsernames.length > 0 && {
        anyOf: allowedUsernames.map((field: string) => ({
          required: [field.includes(".") ? field.split(".").pop()! : field],
        })),
      }),
    };
  }
}

const authPrismaJsonSchemaGenerator = new AuthPrismaJsonSchemaGenerator();

export default authPrismaJsonSchemaGenerator;
