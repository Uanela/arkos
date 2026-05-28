import { z } from "zod";

const UpdateTagSchema = z.object({

});

export default UpdateTagSchema;

export type UpdateTagSchemaType = z.infer<typeof UpdateTagSchema>;
