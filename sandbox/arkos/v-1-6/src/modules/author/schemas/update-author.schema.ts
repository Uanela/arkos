import { z } from "zod";

const UpdateAuthorSchema = z.object({

});

export default UpdateAuthorSchema;

export type UpdateAuthorSchemaType = z.infer<typeof UpdateAuthorSchema>;
