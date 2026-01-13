import { z } from "zod";

const StringFilterSchema = z.object({
  contains: z.string().optional(),
  icontains: z.string().optional(),
  equals: z.string().optional(),
  in: z.array(z.string()).optional(),
  notIn: z.array(z.string()).optional(),
});

const BooleanFilterSchema = z.object({
  equals: z.boolean().optional(),
});

const DateTimeFilterSchema = z.object({
  equals: z.string().optional(),
  gte: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  lt: z.string().optional(),
});

const UserQuerySchema = z.object({
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
  updatedAt: DateTimeFilterSchema.optional(),
});

export default UserQuerySchema;

export type UserQuerySchemaType = z.infer<typeof UserQuerySchema>;
