import { z } from "zod"

const SignupSchema = z.object({
  username: z.string()
    .min(1, "username is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
})

export default SignupSchema

