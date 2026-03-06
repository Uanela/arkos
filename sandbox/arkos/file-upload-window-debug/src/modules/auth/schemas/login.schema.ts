import { z } from "zod";

const LoginSchema = z.object({
  username: z.string(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  theboss: z
    .object({
      name: z.object({ lastName: z.string() }),
    })
    .optional(),
});

export default LoginSchema;

export type LoginSchemaType = z.infer<typeof LoginSchema>;
