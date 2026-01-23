import { z } from "zod";
import { PostType } from "@prisma/client";

const StringFilterSchema = z.object({
  icontains: z.string().optional(),
  equals: z.string().optional(),
});

const BooleanFilterSchema = z.object({
  equals: z.boolean().optional(),
});

const DateTimeFilterSchema = z.object({
  equals: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional(),
});

const PostTypeFilterSchema = z.object({
  equals: z.nativeEnum(PostType).optional(),
});

const QueryPostSchema = z.object({
  id: StringFilterSchema.optional(),
  createdAt: DateTimeFilterSchema.optional(),
  updatedAt: DateTimeFilterSchema.optional(),
  userId: StringFilterSchema.optional(),
  user: z.object({
    id: StringFilterSchema.optional(),
    username: StringFilterSchema.optional(),
    passwordChangedAt: DateTimeFilterSchema.optional(),
    lastLoginAt: DateTimeFilterSchema.optional(),
    isSuperUser: BooleanFilterSchema.optional(),
    isStaff: BooleanFilterSchema.optional(),
    deletedSelfAccountAt: DateTimeFilterSchema.optional(),
    isActive: BooleanFilterSchema.optional(),
    role: StringFilterSchema.optional(),
    createdAt: DateTimeFilterSchema.optional(),
    updatedAt: DateTimeFilterSchema.optional()
  }).optional(),
  userId2: StringFilterSchema.optional(),
  user2: z.object({
    id: StringFilterSchema.optional(),
    username: StringFilterSchema.optional(),
    passwordChangedAt: DateTimeFilterSchema.optional(),
    lastLoginAt: DateTimeFilterSchema.optional(),
    isSuperUser: BooleanFilterSchema.optional(),
    isStaff: BooleanFilterSchema.optional(),
    deletedSelfAccountAt: DateTimeFilterSchema.optional(),
    isActive: BooleanFilterSchema.optional(),
    role: StringFilterSchema.optional(),
    createdAt: DateTimeFilterSchema.optional(),
    updatedAt: DateTimeFilterSchema.optional()
  }).optional(),
  type: PostTypeFilterSchema.optional()
});

export default QueryPostSchema;

export type QueryPostSchemaType = z.infer<typeof QueryPostSchema>;
