import { z } from "zod"
import apiActions from "../../../utils/validation/api-actions"

const UpdateUserSchema = z.object({
  username: z.string()
    .optional(),
  isSuperUser: z.boolean().optional(),
  isStaff: z.boolean().optional(),
  isActive: z.boolean().optional(),
  role: z.string().optional(),
})

export default UpdateUserSchema

export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>
