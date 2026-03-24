import { z } from "zod";

const UpdatePostSchema = z.object({
  views: z.number().optional(),
  user: z.object({ id: z.string() }).optional(),
  user2: z.object({ id: z.string() }).optional(),
  mainTag: z.object({
    name: z.string(),
    slug: z.string(),
    color: z.string().optional(),
    featured: z.boolean()
  }).optional(),
  tags: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    color: z.string().optional(),
    featured: z.boolean()
  })).optional()
});

export type UpdatePostSchemaType = z.infer<typeof UpdatePostSchema>;
export default UpdatePostSchema;
