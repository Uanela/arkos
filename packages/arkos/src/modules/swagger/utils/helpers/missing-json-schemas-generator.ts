import { OpenAPIV3 } from "openapi-types";
import { ArkosConfig } from "../../../../exports";
import PrismaJsonSchemaGenerator from "../../../../utils/prisma/prisma-json-schema-generator";
import pluralize from "pluralize";

/**
 * Used to backfill missing json schema contained in paths in situation such as when using a `arkosConfig.swagger.mode` different from prisma and `strict` to false, in this situation the jsonSchemas paths are filled with $ref pointing to non existent jsonSchema components.
 */
class MissingJsonSchemasGenerator {
  /**
   * Extract model name from schema reference
   * @example
   * "#/components/schemas/CreateUserModelSchema" -> "User"
   * "#/components/schemas/FindManyPostModelSchema" -> "Post"
   */
  private extractModelNameFromSchemaRef(schemaRef: string): string | null {
    const match = schemaRef.match(
      /#\/components\/schemas\/(?:Create|Update|UpdateMany|FindOne|FindMany|CreateMany)?(.+?)(?:ModelSchema|Schema)$/
    );
    if (match) {
      let modelName = match[1];
      // Handle special auth cases
      if (
        modelName.toLowerCase() === "auth" ||
        modelName.toLowerCase() === "login" ||
        modelName.toLowerCase() === "signup" ||
        modelName.toLowerCase() === "getme" ||
        modelName.toLowerCase() === "updateme" ||
        modelName.toLowerCase() === "updatepassword"
      ) {
        return "Auth";
      }
      return modelName;
    }
    return null;
  }

  /**
   * Extract action type from operationId
   * @example
   * "createManyUser" -> "createMany"
   * "findUsers" -> "findMany"
   * "updateUser" -> "updateOne"
   */
  private extractActionFromOperationId(operationId: string): string | null {
    if (!operationId) return null;
    // Handle bulk operations first (more specific patterns)
    if (operationId.includes("createMany")) return "createMany";
    if (operationId.includes("updateMany")) return "updateMany";
    if (operationId.includes("deleteMany")) return "deleteMany";
    if (operationId.includes("updateMe")) return "updateMe";
    if (operationId.includes("updatePassword")) return "updatePassword";

    // Handle single operations
    if (operationId.startsWith("create")) return "createOne";
    if (operationId.startsWith("update")) return "updateOne";
    if (operationId.startsWith("delete")) return "deleteOne";
    if (
      operationId.startsWith("find") &&
      (operationId.includes("ById") || operationId.includes("One"))
    )
      return "findOne";
    if (operationId.startsWith("find")) return "findMany";

    // Handle auth operations
    if (operationId.includes("login") || operationId === "login")
      return "login";
    if (operationId.includes("signup") || operationId === "signup")
      return "signup";
    if (operationId.includes("getMe") || operationId === "getMe")
      return "getMe";
    if (operationId.includes("updateMe") || operationId === "updateMe")
      return "updateMe";
    if (
      operationId.includes("updatePassword") ||
      operationId === "updatePassword"
    )
      return "updatePassword";

    return null;
  }

  /**
   * Extract model name from operationId
   * @example
   * "createManyUser" -> "User"
   * "findUsers" -> "User"
   * "updateUser" -> "User"
   */
  private extractModelNameFromOperationId(operationId: string): string | null {
    if (!operationId) return null;
    // Remove common prefixes and suffixes to isolate model name
    let modelName = operationId
      .replace(/^(create|update|delete|find)Many/i, "")
      .replace(/^(create|update|delete|find)/i, "")
      .replace(/ById$/i, "");

    // Handle auth operations
    if (
      operationId.toLowerCase().includes("login") ||
      operationId.toLowerCase().includes("signup") ||
      operationId.toLowerCase().includes("getme") ||
      operationId.toLowerCase().includes("updateme") ||
      operationId.toLowerCase().includes("updatepassword")
    ) {
      return "Auth";
    }

    return pluralize.singular(modelName) || null;
  }

  /**
   * Recursively extract all $ref values from an object along with their context
   */
  private extractSchemaRefsWithContext(
    obj: any,
    refs: Map<
      string,
      { operationId?: string; method?: string; path?: string }
    > = new Map(),
    context: { operationId?: string; method?: string; path?: string } = {}
  ): Map<string, { operationId?: string; method?: string; path?: string }> {
    if (typeof obj !== "object" || obj === null) {
      return refs;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) =>
        this.extractSchemaRefsWithContext(item, refs, context)
      );
      return refs;
    }

    // Update context when we find operationId
    if (obj.operationId && typeof obj.operationId === "string") {
      context = { ...context, operationId: obj.operationId };
    }

    if (obj.$ref && typeof obj.$ref === "string") {
      refs.set(obj.$ref, { ...context });
    }

    Object.values(obj).forEach((value) => {
      this.extractSchemaRefsWithContext(value, refs, context);
    });

    return refs;
  }

  /**
   * Extract schema references from paths with context
   */
  private extractPathSchemaRefs(
    paths: OpenAPIV3.PathsObject
  ): Map<string, { operationId?: string; method?: string; path?: string }> {
    const refs = new Map<
      string,
      { operationId?: string; method?: string; path?: string }
    >();

    Object.entries(paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      Object.entries(pathItem).forEach(([method, operation]) => {
        if (!operation || typeof operation !== "object") return;

        const context = {
          method,
          path,
          operationId: (operation as any).operationId,
        };

        this.extractSchemaRefsWithContext(operation, refs, context);
      });
    });

    return refs;
  }

  /**
   * Extract schema name from $ref
   * @example
   * "#/components/schemas/CreateUserModelSchema" -> "CreateUserModelSchema"
   */
  private getSchemaNameFromRef(ref: string): string | null {
    const match = ref.match(/#\/components\/schemas\/(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * When using swagger with strict set to false and needs fallback to prisma for the required json schemas that where not manually provided through zod schemas or class validator classes.
   */
  generateMissingJsonSchemas(
    currentPaths: OpenAPIV3.PathsObject,
    currentJsonSchemas: Record<string, any>,
    arkosConfig: ArkosConfig
  ): Record<string, any> {
    const missingSchemas: Record<string, any> = {};

    const schemaRefsWithContext = this.extractPathSchemaRefs(currentPaths);

    const modelActions = new Map<string, Set<string>>();

    for (const [ref, context] of schemaRefsWithContext) {
      const schemaName = this.getSchemaNameFromRef(ref);
      if (!schemaName) continue;

      if (currentJsonSchemas[schemaName]) continue;

      if (!schemaName.includes("ModelSchema") && !schemaName.includes("Schema"))
        continue;

      let modelName: string | null = null;
      let action: string | null = null;

      if (context.operationId) {
        modelName = this.extractModelNameFromOperationId(context.operationId);
        action = this.extractActionFromOperationId(context.operationId);
      }

      if (!modelName || !action) {
        modelName = modelName || this.extractModelNameFromSchemaRef(ref);
        action = action || this.extractActionFromSchemaRef(ref);
      }

      if (modelName && action) {
        if (!modelActions.has(modelName))
          modelActions.set(modelName, new Set());

        modelActions.get(modelName)!.add(action);
      }
    }

    // Generate schemas for each model
    for (const [modelName, actions] of modelActions) {
      try {
        const actionsArray = Array.from(actions) as any[];

        const generatedSchemas = PrismaJsonSchemaGenerator.generateModelSchemas(
          {
            modelName,
            arkosConfig,
            schemasToGenerate: actionsArray,
          }
        );

        Object.entries(generatedSchemas).forEach(([key, schema]) => {
          // The enhanced generator might use different naming conventions
          // We need to map them to match what's expected in the $refs
          let mappedKey = key;
          const authModuleModel = ["auth", "login", "me", "password", "me"];

          if (authModuleModel.includes(modelName.toLowerCase())) {
            if (key === "LoginSchema") mappedKey = "LoginSchema";
            else if (key === "SignupSchema") mappedKey = "SignupSchema";
            else if (key === "GetMeSchema") mappedKey = "GetMeSchema";
            else if (key === "UpdateMeSchema") mappedKey = "UpdateMeSchema";
            else if (key === "UpdatePasswordSchema")
              mappedKey = "UpdatePasswordSchema";
          } else {
            if (key.includes("ModelSchema")) mappedKey = key;
            else mappedKey = `${key}ModelSchema`;
          }

          missingSchemas[mappedKey] = schema;
        });
      } catch (error) {
        // console.warn(
        //   `Failed to generate schemas for model ${modelName}:`,
        //   error
        // );
      }
    }

    return missingSchemas;
  }

  /**
   * Legacy method - extract action type from schema reference (kept for backward compatibility)
   */
  private extractActionFromSchemaRef(schemaRef: string): string | null {
    if (schemaRef.includes("CreateMany")) return "createMany";
    if (schemaRef.includes("Create")) return "createOne";
    if (schemaRef.includes("UpdateMany")) return "updateMany";
    if (
      schemaRef.includes("Update") &&
      !schemaRef.includes("UpdateMe") &&
      !schemaRef.includes("UpdatePassword")
    )
      return "updateOne";
    if (schemaRef.includes("FindMany")) return "findMany";
    if (schemaRef.includes("FindOne")) return "findOne";
    if (schemaRef.includes("Login")) return "login";
    if (schemaRef.includes("Signup")) return "signup";
    if (schemaRef.includes("GetMe")) return "getMe";
    if (schemaRef.includes("UpdateMe")) return "updateMe";
    if (schemaRef.includes("UpdatePassword")) return "updatePassword";

    return null;
  }

  /**
   * Debug method to analyze what schemas are missing with enhanced context
   */
  analyzeMissingSchemas(
    currentPaths: OpenAPIV3.PathsObject,
    currentJsonSchemas: Record<string, any>
  ): {
    allRefs: Array<{ ref: string; context: any }>;
    missingRefs: Array<{ ref: string; context: any }>;
    existingRefs: Array<{ ref: string; context: any }>;
    modelActions: {
      model: string;
      action: string;
      ref: string;
      operationId?: string;
    }[];
  } {
    const schemaRefsWithContext = this.extractPathSchemaRefs(currentPaths);

    const allRefs: Array<{ ref: string; context: any }> = [];
    const missingRefs: Array<{ ref: string; context: any }> = [];
    const existingRefs: Array<{ ref: string; context: any }> = [];
    const modelActions: {
      model: string;
      action: string;
      ref: string;
      operationId?: string;
    }[] = [];

    for (const [ref, context] of schemaRefsWithContext) {
      const refWithContext = { ref, context };
      allRefs.push(refWithContext);

      const schemaName = this.getSchemaNameFromRef(ref);
      if (!schemaName) continue;

      if (currentJsonSchemas[schemaName]) {
        existingRefs.push(refWithContext);
      } else {
        missingRefs.push(refWithContext);

        let modelName: string | null = null;
        let action: string | null = null;

        // Try operationId first
        if (context.operationId) {
          modelName = this.extractModelNameFromOperationId(context.operationId);
          action = this.extractActionFromOperationId(context.operationId);
        }

        // Fallback to schema ref
        if (!modelName || !action) {
          modelName = modelName || this.extractModelNameFromSchemaRef(ref);
          action = action || this.extractActionFromSchemaRef(ref);
        }

        if (modelName && action) {
          modelActions.push({
            model: modelName,
            action,
            ref,
            operationId: context.operationId,
          });
        }
      }
    }

    return {
      allRefs,
      missingRefs,
      existingRefs,
      modelActions,
    };
  }
}

const missingJsonSchemaGenerator = new MissingJsonSchemasGenerator();

export default missingJsonSchemaGenerator;
