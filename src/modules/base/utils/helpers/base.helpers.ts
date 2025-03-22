import {
  getPrismaModelRelations,
  RelationFields,
  getModelUniqueFields,
} from "../../../../utils/helpers/models.helpers";

/**
 * Removes apiAction field from an object and all nested objects
 *
 * @param {Record<string, any>} obj - The object to clean
 * @returns {Record<string, any>} - The cleaned object
 */
function removeApiAction(obj: Record<string, any>): Record<string, any> {
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
 * @param {Record<string, any>} body - The object containing relation fields to be processed.
 * @param {Object} relationFields - Defines relation field types.
 * @param {RelationFields[]} relationFields.singular - List of one-side relation field names (one-to-one).
 * @param {RelationFields[]} relationFields.list - List of many-side relation field names (one-to-many).
 * @param {string[]} ignoreActions - Optional list of apiAction values to ignore.
 * @returns {Record<string, any>} The transformed data with appropriate Prisma operations applied.
 */
export function handleRelationFieldsInBody(
  body: Record<string, any>,
  relationFields: RelationFields,
  ignoreActions: string[] = []
) {
  let mutableBody = { ...body };

  relationFields?.list?.forEach((field) => {
    if (!body[field.name]) return;

    const createData: any[] = [];
    const connectData: any[] = [];
    const updateData: any[] = [];
    const disconnectData: any[] = [];
    const deleteManyIds: any[] = [];

    body[field.name]?.forEach((bodyField: any) => {
      if (ignoreActions.includes(bodyField?.apiAction)) return;

      const apiAction = bodyField?.apiAction;

      if (apiAction === "delete") {
        deleteManyIds.push(bodyField.id);
      } else if (apiAction === "disconnect") {
        disconnectData.push({ id: bodyField.id });
      } else if (canBeUsedToConnect(field.type, bodyField)) {
        // Handle connection with unique fields or ID
        const { apiAction: _, ...cleanedData } = bodyField;
        connectData.push(cleanedData);
      } else if (!bodyField?.id) {
        // If no ID, assume create operation
        let nestedRelations = getPrismaModelRelations(field.type);

        let dataToPush = { ...bodyField };

        if (nestedRelations) {
          dataToPush = handleRelationFieldsInBody(
            dataToPush,
            nestedRelations,
            ignoreActions
          );
        }

        // Ensure apiAction is removed
        if ("apiAction" in dataToPush) {
          const { apiAction: _, ...rest } = dataToPush;
          dataToPush = rest;
        }

        createData.push(dataToPush);
      } else {
        // If ID and other fields, assume update operation
        const { id, apiAction: _, ...data } = bodyField;

        let nestedRelations = getPrismaModelRelations(field.type);

        let dataToPush = data;
        if (nestedRelations) {
          dataToPush = handleRelationFieldsInBody(
            data,
            nestedRelations,
            ignoreActions
          );
        }

        updateData.push({
          where: { id },
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
    if (!body[field.name]) return;
    if (ignoreActions.includes(body[field.name]?.apiAction)) return;

    const relationData = body[field.name];
    let nestedRelations = getPrismaModelRelations(field.type);

    if (canBeUsedToConnect(field.type, relationData)) {
      // Handle connection with unique fields or ID
      const { apiAction: _, ...cleanedData } = relationData;
      mutableBody[field.name] = { connect: cleanedData };
    } else if (!relationData?.id) {
      // If no ID, assume create operation
      let dataToCreate = { ...relationData };

      if ("apiAction" in dataToCreate) {
        const { apiAction: _, ...rest } = dataToCreate;
        dataToCreate = rest;
      }

      if (nestedRelations) {
        dataToCreate = handleRelationFieldsInBody(
          dataToCreate,
          nestedRelations,
          ignoreActions
        );
      }

      mutableBody[field.name] = { create: dataToCreate };
    } else {
      // If ID and other fields, assume update operation
      const { id, apiAction: _, ...data } = relationData;

      let dataToUpdate = data;
      if (nestedRelations) {
        dataToUpdate = handleRelationFieldsInBody(
          data,
          nestedRelations,
          ignoreActions
        );
      }

      mutableBody[field.name] = {
        update: {
          data: dataToUpdate,
        },
      };
    }
  });

  // Remove any remaining apiAction fields from the top level
  if ("apiAction" in mutableBody) {
    const { apiAction, ...rest } = mutableBody;
    mutableBody = rest;
  }

  // As a final step, recursively remove any remaining apiAction fields
  return removeApiAction(mutableBody);
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
  // If the field is null or undefined, it can't be used to connect
  if (!bodyField) return false;

  // If the field has an apiAction that's not for connecting, return false
  if (bodyField.apiAction && !["connect"].includes(bodyField.apiAction)) {
    return false;
  }

  // If explicitly marked for connect, allow it
  if (bodyField.apiAction === "connect") {
    return true;
  }

  // If only ID is present, it can be used to connect
  if (Object.keys(bodyField).length === 1 && bodyField?.id) {
    return true;
  }

  // Get unique fields for the model
  const uniqueFields = getModelUniqueFields(modelName);

  // If the field has exactly one property and it's a unique field, it can be used to connect
  if (Object.keys(bodyField).length === 1) {
    const fieldName = Object.keys(bodyField)[0];
    return uniqueFields.some((field) => field.name === fieldName);
  }

  return false;
}

/**
 * Checks if a list field is actually an array
 *
 * @param {any} field - The field to check
 * @returns {boolean} - True if the field is an array
 */
export function isListFieldAnArray(field: any): boolean {
  return Array.isArray(field);
}
