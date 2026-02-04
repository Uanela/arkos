import prismaSchemaParser from "../../../../utils/prisma/prisma-schema-parser";
import { PrismaField } from "../../../../utils/prisma/types";
import AppError from "../../../error-handler/utils/app-error";

/**
 * Removes apiAction field from an object and all nested objects
 *
 * @param {Record<string, any>} obj - The object to clean
 * @returns {Record<string, any>} - The cleaned object
 */
export function removeApiAction(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === "apiAction") continue;

    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null ? removeApiAction(item) : item
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = removeApiAction(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

const prismaOperations = [
  "create",
  "connect",
  "update",
  "delete",
  "disconnect",
  "deleteMany",
  "connectOrCreate",
  "upsert",
  "set",
];

/**
 * Checks if an object is already formatted as a Prisma relation operation
 *
 * @param {Record<string, any>} obj - The object to check
 * @returns {boolean} - True if the object contains Prisma relation operations
 */
export function isPrismaRelationFormat(obj: Record<string, any>): boolean {
  if (!obj || typeof obj !== "object") return false;

  // Check if any key is a Prisma operation
  return prismaOperations.some((op) => obj?.[op]);
}

export function throwErrorIfApiActionIsInvalid(apiAction: string) {
  if (apiAction && !prismaOperations.includes(apiAction))
    throw Error(
      `Unknown value "${apiAction}" for apiAction field, available values are ${prismaOperations.join(", ")}.`
    );
}

/**
 * Determines the appropriate Prisma operation (`create`, `connect`, `update`, `delete`, or `disconnect`)
 * for each relation field in the provided body based on its nested data and recursively does the same for each relation field.
 *
 * This function handles the following types of relations:
 * - **One-to-one**
 * - **One-to-many**
 *
 *
 * ### Operation Rules:
 *
 *
 * - **Create**: Used when the nested relation data is provided **without an `id` or unique field**.
 * - **Connect**: Used when the nested relation data contains **only an `id` or a unique field** (e.g., email).
 * - **Update**: Used when the nested relation data contains **both an `id` and additional fields**.
 * - **Delete**: Used when the nested relation data includes **`apiAction: "delete"`**.
 * - **Disconnect**: Used when the nested relation data includes **`apiAction: "disconnect"`**.
 *
 * The function will preserve existing Prisma operation formats if detected,
 * allowing developers to manually structure relation operations when needed.
 *
 * @param {Record<string, any>} body - The object containing relation fields to be processed.
 * @param {ModelGroupRelationFields} relationFields - List of many-side relation field names (one-to-many).
 * @param {string[]} ignoreActions - Optional list of apiAction values to ignore.
 * @returns {Record<string, any>} The transformed data with appropriate Prisma operations applied.
 */
export function handleRelationFieldsInBody(
  body: Record<string, any>,
  relationFields: ModelGroupRelationFields,
  ignoreActions: string[] = []
): Record<string, any> {
  body = JSON.parse(JSON.stringify(body));
  let mutableBody = { ...body };

  relationFields?.list?.forEach((field) => {
    if (!body?.[field.name]) return;

    if (ignoreActions?.includes?.(body[field.name]?.apiAction)) {
      delete mutableBody[field.name];
      return;
    }

    if (isPrismaRelationFormat(body[field.name])) return;

    if (!Array.isArray(body[field.name])) return;

    const createData: any[] = [];
    const connectData: any[] = [];
    const updateData: any[] = [];
    const disconnectData: any[] = [];
    const deleteManyIds: any[] = [];

    body[field.name]?.forEach((bodyField: any) => {
      if (ignoreActions?.includes?.(bodyField?.apiAction)) return;

      const apiAction = bodyField?.apiAction;

      throwErrorIfApiActionIsInvalid(apiAction);

      if (apiAction === "delete") {
        deleteManyIds.push(bodyField.id);
      } else if (apiAction === "disconnect") {
        disconnectData.push({ id: bodyField.id });
      } else if (
        bodyField?.apiAction !== "update" &&
        canBeUsedToConnect(field.type, bodyField)
      ) {
        const { apiAction, ...cleanedData } = bodyField;

        throwErrorIfApiActionIsInvalid(apiAction);
        connectData.push(cleanedData);
      } else if (bodyField?.apiAction !== "update" && !bodyField?.id) {
        let nestedRelations = getGroupedModelReations(field.type);

        let dataToPush = { ...bodyField };

        if (nestedRelations?.singular || nestedRelations?.list) {
          dataToPush = handleRelationFieldsInBody(
            dataToPush,
            nestedRelations,
            ignoreActions
          );
        }

        if (dataToPush?.apiAction) {
          const { apiAction, ...rest } = dataToPush;

          throwErrorIfApiActionIsInvalid(apiAction);
          dataToPush = rest;
        }

        createData.push(dataToPush);
      } else {
        const { apiAction, ...data } = bodyField;
        let foreignKeyFieldName = bodyField?.id ? "id" : "";
        let foreignKeyFieldValue = bodyField?.id ? bodyField.id : "";

        if (!foreignKeyFieldName) {
          for (const [key, value] of Object.entries(data)) {
            if (canBeUsedToConnect(field.type, { [key]: value })) {
              foreignKeyFieldName = key;
              break;
            }
          }

          if (!foreignKeyFieldName)
            throw new AppError(
              "No unique fields to be used in the prisma where clause",
              400,
              "NoFieldToIsInPrismaWhereClause",
              { data: body }
            );
        }

        foreignKeyFieldValue = data[foreignKeyFieldName];
        delete data[foreignKeyFieldName];

        throwErrorIfApiActionIsInvalid(apiAction);
        let nestedRelations = getGroupedModelReations(field.type);

        let dataToPush = data;
        if (nestedRelations?.singular || nestedRelations?.list) {
          dataToPush = handleRelationFieldsInBody(
            data,
            nestedRelations,
            ignoreActions
          );
        }

        updateData.push({
          where: { [foreignKeyFieldName]: foreignKeyFieldValue },
          data: dataToPush,
        });
      }
    });

    mutableBody[field.name] = {
      ...(createData.length ? { create: createData } : {}),
      ...(connectData.length ? { connect: connectData } : {}),
      ...(updateData.length ? { update: updateData } : {}),
      ...(disconnectData.length ? { disconnect: disconnectData } : {}),
      ...(deleteManyIds.length
        ? { deleteMany: { id: { in: deleteManyIds } } }
        : {}),
    };
  });

  relationFields?.singular?.forEach((field) => {
    if (!body?.[field.name]) return;

    if (ignoreActions?.includes?.(body[field.name]?.apiAction)) {
      delete mutableBody[field.name];
      return;
    }

    if (isPrismaRelationFormat(body[field.name])) {
      return;
    }

    const relationData = body[field.name];
    let nestedRelations = getGroupedModelReations(field.type);

    if (relationData?.apiAction === "delete") {
      mutableBody[field.name] = { delete: true };
    } else if (relationData?.apiAction === "disconnect") {
      mutableBody[field.name] = { disconnect: true };
    } else if (
      relationData?.apiAction !== "update" &&
      canBeUsedToConnect(field.type, relationData)
    ) {
      const { apiAction, ...cleanedData } = relationData;

      throwErrorIfApiActionIsInvalid(apiAction);

      mutableBody[field.name] = { connect: cleanedData };
    } else if (relationData?.apiAction !== "update" && !relationData?.id) {
      let dataToCreate = { ...relationData };

      if (dataToCreate?.apiAction) {
        const { apiAction, ...rest } = dataToCreate;
        throwErrorIfApiActionIsInvalid(apiAction);

        dataToCreate = rest;
      }

      if (nestedRelations?.singular || nestedRelations?.list) {
        dataToCreate = handleRelationFieldsInBody(
          dataToCreate,
          nestedRelations,
          ignoreActions
        );
      }

      mutableBody[field.name] = { create: dataToCreate };
    } else {
      // If ID and other fields, assume update operation
      const { id, apiAction, ...data } = relationData;

      throwErrorIfApiActionIsInvalid(apiAction);

      let dataToUpdate = data;
      if (nestedRelations?.singular || nestedRelations?.list) {
        dataToUpdate = handleRelationFieldsInBody(
          data,
          nestedRelations,
          ignoreActions
        );
      }

      mutableBody[field.name] = {
        update: {
          where: { id },
          data: dataToUpdate,
        },
      };
    }
  });

  if (mutableBody?.apiAction) {
    throw new AppError(
      "Invalid usage of apiAction field, it must only be used on relation fields whether single or multiple.",
      500,
      {
        data: {
          ...body,
        },
      }
    );
  }

  // As a final step, recursively remove any remaining apiAction fields
  return removeApiAction(mutableBody);
}

export type ModelGroupRelationFields = ReturnType<
  typeof getGroupedModelReations
>;

function getGroupedModelReations(modelName: string) {
  const relationsFields = prismaSchemaParser.getModelRelations(modelName);

  return {
    singular: relationsFields?.filter(
      (field) => field.isRelation && !field.isArray
    ),
    list: relationsFields?.filter((field) => field.isRelation && field.isArray),
  };
}

/**
 * Checks if a field value can be used to connect to a model
 * This happens when the field contains only an ID or a single unique field
 *
 * @param {string} modelName - The model name to get unique fields for
 * @param {Record<string, any>} bodyField - The field value from the body
 * @returns {boolean} True if the field can be used for a connect operation
 */
export function canBeUsedToConnect(
  modelName: string,
  bodyField: Record<string, any> | undefined | null
): boolean {
  if (!bodyField) return false;

  if (bodyField.apiAction && !["connect"]?.includes?.(bodyField.apiAction))
    return false;

  if (bodyField.apiAction === "connect") return true;

  if (Object.keys(bodyField)?.length === 1 && bodyField?.id) return true;

  const uniqueFields = prismaSchemaParser.getModelUniqueFields(modelName) || [];

  if (Object.keys(bodyField).length === 1 && uniqueFields?.length > 0) {
    const fieldName = Object.keys(bodyField)[0];
    return uniqueFields?.some((field: PrismaField) => field.name === fieldName);
  }

  return false;
}
