import { z } from "zod";

const CreateTagSchema = z.object({

});

export default CreateTagSchema;

export type CreateTagSchemaType = z.infer<typeof CreateTagSchema>;
