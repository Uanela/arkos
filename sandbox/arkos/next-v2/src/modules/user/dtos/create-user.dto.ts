import { z } from "zod";
import { UserRole } from "@/src/generated/prisma/client";

const CreateUserDto = z.object({
  email: z.string().min(1, "email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  isSuperUser: z.boolean().optional().default(false),
  isStaff: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  roles: z.array(z.enum(UserRole)),
});

export default CreateUserDto;
export type CreateUserDto = z.infer<typeof CreateUserDto>;
