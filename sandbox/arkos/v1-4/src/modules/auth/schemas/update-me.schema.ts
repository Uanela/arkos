import { z } from "zod"

const UpdateMeSchema = z.object({
  username: z.string()
    .optional(),
})

export default UpdateMeSchema

export type UpdateMeSchemaType = z.infer<typeof UpdateMeSchema>
