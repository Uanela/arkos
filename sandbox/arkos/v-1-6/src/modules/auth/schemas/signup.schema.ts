import { z } from "zod"

const SignupSchema = z.object({
  email: z.string()
    .min(1, "email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
})

export default SignupSchema

export type SignupSchemaType = z.infer<typeof SignupSchema>
