import { z } from "zod";

const CreateUserSchema = z.object({
  username: z.string().min(1, "username is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  isSuperUser: z.boolean().optional().default(false),
  isStaff: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  role: z.string(),
  posts: z.array(z.object({ id: z.string() })),
});

export default CreateUserSchema;

export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>;
