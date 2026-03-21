import { z } from "zod";

const CreatePostSchema = z.object({
  views: z.number(),
  user: z.object({ id: z.string() }),
  user2: z.object({ id: z.string() }),
  mainTag: z.object({
    name: z.string(),
    slug: z.string(),
    color: z.string().optional(),
    featured: z.boolean()
  }),
  tags: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    color: z.string().optional(),
    featured: z.boolean()
  }))
});

export type CreatePostSchemaType = z.infer<typeof CreatePostSchema>;
export default CreatePostSchema;
