import { z } from "zod";
import { PostType } from "@prisma/client";

const StringFilterSchema = z.object({
  icontains: z.string().optional()
});

const DateTimeFilterSchema = z.object({
  equals: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional()
});

const QueryPostSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  sort: z.string().optional(),
  fields: z.string().optional(),
  title: StringFilterSchema.optional(),
  user: z.object({ id: z.string().optional() }).optional(),
  user2: z.object({ id: z.string().optional() }).optional(),
  type: z.nativeEnum(PostType).optional(),
  createdAt: DateTimeFilterSchema.optional(),
  updatedAt: DateTimeFilterSchema.optional()
});

export default QueryPostSchema;

export type QueryPostSchemaType = z.infer<typeof QueryPostSchema>;
