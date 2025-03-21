import {
  getPrismaModelRelations,
  RelationFields,
} from "../../../utils/helpers/models.helpers";

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

  relationFields.list.forEach((field) => {
    if (!body[field.name]) return;

    const createData: any[] = [];
    const connectData: any[] = [];
    const updateData: any[] = [];
    const disconnectData: any[] = [];
    const deleteManyIds: any[] = [];

    body[field.name]?.forEach((bodyField: any) => {
      if (ignoreActions.includes(bodyField?.apiAction)) return;

      if (bodyField?.apiAction === "delete") {
        deleteManyIds.push(bodyField.id);
      } else if (bodyField?.apiAction === "disconnect") {
        disconnectData.push({ id: bodyField.id });
      } else if (canBeUsedToConnect(field, bodyField)) {
        // Handle connection with unique fields or ID
        connectData.push(bodyField);
      } else if (!bodyField?.id) {
        // If no ID, assume create operation
        let nestedRelations = getPrismaModelRelations(field.type);
        const dataToPush = nestedRelations
          ? handleRelationFieldsInBody(
              bodyField,
              nestedRelations,
              ignoreActions
            )
          : bodyField;
        createData.push(dataToPush);
      } else {
        // If ID and other fields, assume update operation
        const { id, ...data } = bodyField;

        let nestedRelations = getPrismaModelRelations(field.type);

        const dataToPush = nestedRelations
          ? handleRelationFieldsInBody(data, nestedRelations, ignoreActions)
          : data;
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

  relationFields.singular.forEach((field) => {
    if (!body[field.name]) return;
    if (ignoreActions.includes(body[field.name]?.apiAction)) return;

    const relationData = body[field.name];
    let nestedRelations = getPrismaModelRelations(field.type);

    if (canBeUsedToConnect(field, relationData)) {
      // Handle connection with unique fields or ID
      mutableBody[field.name] = { connect: relationData };
    } else if (!relationData?.id) {
      // If no ID, assume create operation
      mutableBody[field.name] = {
        create: nestedRelations
          ? handleRelationFieldsInBody(
              relationData,
              nestedRelations,
              ignoreActions
            )
          : relationData,
      };
    } else {
      // If ID and other fields, assume update operation
      const { id, ...data } = relationData;
      mutableBody[field.name] = {
        update: {
          where: { id },
          data: nestedRelations
            ? handleRelationFieldsInBody(data, nestedRelations, ignoreActions)
            : data,
        },
      };
    }
  });

  return mutableBody;
}

/**
 * Checks if a field value can be used to connect to a model
 * This happens when the field contains only an ID or a single unique field
 *
 * @param {RelationFields} field - The field definition with type and uniqueness info
 * @param {Record<string, any>} bodyField - The field value from the body
 * @returns {boolean} True if the field can be used for a connect operation
 */
export function canBeUsedToConnect(
  field: any,
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
  if (Object.keys(bodyField).length === 1 && bodyField.id) {
    return true;
  }

  // If the field has a unique property and only one property is provided
  if (field.isUnique && Object.keys(bodyField).length === 1) {
    return true;
  }

  // If the model has unique fields and one of them is the only property
  const uniqueFields = field.uniqueFields || [];
  if (uniqueFields.length > 0) {
    const bodyKeys = Object.keys(bodyField);
    // If only one field is provided and it's in the unique fields list
    if (bodyKeys.length === 1 && uniqueFields.includes(bodyKeys[0])) {
      return true;
    }
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
