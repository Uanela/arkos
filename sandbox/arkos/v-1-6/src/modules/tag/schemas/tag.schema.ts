import { z } from "zod";

const TagSchema = z.object({
  id: z.string(),
  createdAt: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date'),
  updatedAt: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date')
});

export default TagSchema;

export type TagSchemaType = z.infer<typeof TagSchema>;
