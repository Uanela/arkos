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
 * - **Create**: Used when the nested relation data is provided **without an `id`**.
 * - **Connect**: Used when the nested relation data contains **only an `id`**.
 * - **Update**: Used when the nested relation data contains **both an `id` and additional fields**.
 * - **Delete**: Used when the nested relation data includes **`apiAction: "delete"`**.
 * - **Disconnect**: Used when the nested relation data includes **`apiAction: "disconnect"`**.
 *
 * @param {Record<string, any>} body - The object containing relation fields to be processed.
 * @param {Object} relationFields - Defines relation field types.
 * @param {RelationFields[]} relationFields.singular - List of one-side relation field names (one-to-one).
 * @param {RelationFields[]} relationFields.list - List of many-side relation field names (one-to-many).
 * @returns {T} The transformed data with appropriate Prisma operations applied.
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

    body[field.name].forEach((bodyField: any) => {
      if (ignoreActions.includes(bodyField?.apiAction)) return;

      if (bodyField?.apiAction === "delete") {
        deleteManyIds.push(bodyField.id);
      } else if (bodyField?.apiAction === "disconnect") {
        disconnectData.push({ id: bodyField.id });
      } else if (!bodyField?.id) {
        let nestedRelations = getPrismaModelRelations(field.type);
        const dataToPush = nestedRelations
          ? handleRelationFieldsInBody(
              bodyField,
              nestedRelations,
              ignoreActions
            )
          : bodyField;
        createData.push(dataToPush);
      } else if (Object.keys(bodyField).length === 1) {
        connectData.push(bodyField);
      } else {
        const { id, ...data } = bodyField;

        let nestedRelations = getPrismaModelRelations(field.type);

        const dataToPush = nestedRelations
          ? handleRelationFieldsInBody(data, nestedRelations, ignoreActions)
          : bodyField;
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

    let nestedRelations = getPrismaModelRelations(field.type);

    if (!body[field.name]?.id) {
      mutableBody[field.name] = {
        create: handleRelationFieldsInBody(
          body[field.name],
          nestedRelations!,
          ignoreActions
        ),
      };
    } else if (Object.keys(body[field.name]).length === 1) {
      mutableBody[field.name] = { connect: body[field.name] };
    } else {
      const { id, ...data } = body[field.name];
      mutableBody[field.name] = {
        update: {
          where: { id },
          data: handleRelationFieldsInBody(
            data,
            nestedRelations!,
            ignoreActions
          ),
        },
      };
    }
  });

  return mutableBody;
}
