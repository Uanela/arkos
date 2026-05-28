import { z } from "zod";

const CreatePostSchema = z.object({

});

export default CreatePostSchema;

export type CreatePostSchemaType = z.infer<typeof CreatePostSchema>;
