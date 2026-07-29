import { z } from "zod";

const SignupDto = z.object({
  email: z.string().min(1, "email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export default SignupDto;
export type SignupDto = z.infer<typeof SignupDto>;
