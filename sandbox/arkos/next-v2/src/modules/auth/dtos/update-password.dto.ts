import { z } from "zod";

const UpdatePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export default UpdatePasswordDto;
export type UpdatePasswordDto = z.infer<typeof UpdatePasswordDto>;
