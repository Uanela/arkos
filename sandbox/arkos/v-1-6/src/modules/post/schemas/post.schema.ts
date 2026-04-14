import { z } from "zod";

const PostSchema = z.object({
  id: z.string(),
  createdAt: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date'),
  updatedAt: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date')
});

export default PostSchema;

export type PostSchemaType = z.infer<typeof PostSchema>;
