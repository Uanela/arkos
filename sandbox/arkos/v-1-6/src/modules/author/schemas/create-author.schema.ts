import { z } from "zod";

const CreateAuthorSchema = z.object({

});

export default CreateAuthorSchema;

export type CreateAuthorSchemaType = z.infer<typeof CreateAuthorSchema>;
