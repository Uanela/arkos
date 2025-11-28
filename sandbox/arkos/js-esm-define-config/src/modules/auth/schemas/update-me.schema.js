import { z } from "zod"

const UpdateMeSchema = z.object({
  username: z.string()
    .optional(),
})

export default UpdateMeSchema

