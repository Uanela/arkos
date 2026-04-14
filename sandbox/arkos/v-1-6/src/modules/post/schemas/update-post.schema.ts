import { z } from "zod";

const UpdatePostSchema = z.object({

});

export default UpdatePostSchema;

export type UpdatePostSchemaType = z.infer<typeof UpdatePostSchema>;
