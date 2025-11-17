import { getMetadataStorage } from "class-validator";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { importModule } from "../../../../utils/helpers/global.helpers";

export default async function classValidatorToJsonSchema(
  decoratedClass: new (...args: any[]) => object
): Promise<any> {
  const { defaultMetadataStorage } = await importModule(
    "class-transformer/cjs/storage.js"
  );

  const jsonSchemas = validationMetadatasToSchemas({
    classValidatorMetadataStorage: getMetadataStorage(),
    classTransformerMetadataStorage: defaultMetadataStorage,
    refPointerPrefix: "#/components/schemas/",
  });

  return jsonSchemas[decoratedClass.name];
}
