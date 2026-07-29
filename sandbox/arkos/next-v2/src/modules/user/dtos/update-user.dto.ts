import { z } from "zod";
import apiActions from "@/src/utils/validation/api-actions";
import { UserRole } from "@/src/generated/prisma/client";

const UpdateUserDto = z.object({
  email: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .optional(),
  isSuperUser: z.boolean().optional(),
  isStaff: z.boolean().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.enum(UserRole)).optional(),
});

export default UpdateUserDto;
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;
