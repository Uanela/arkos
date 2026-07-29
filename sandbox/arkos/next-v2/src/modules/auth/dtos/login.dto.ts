import { z } from "zod";

const LoginDto = z.object({
  email: z.string(),
  password: z.string().min(1, "Password must be at least 1 characters long"),
});

export default LoginDto;
export type LoginDto = z.infer<typeof LoginDto>;
