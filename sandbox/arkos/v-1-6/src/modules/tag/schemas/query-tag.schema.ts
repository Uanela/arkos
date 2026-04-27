import { z } from "zod";

const DateTimeFilterSchema = z.object({
  equals: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional()
});

const QueryTagSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().max(100).optional(),
  sort: z.string().optional(),
  fields: z.string().optional(),
  createdAt: DateTimeFilterSchema.optional(),
  updatedAt: DateTimeFilterSchema.optional()
});

export default QueryTagSchema;

export type QueryTagSchemaType = z.infer<typeof QueryTagSchema>;
