import { z } from "zod";

const UpdateMeDto = z.object({
  email: z.string().optional(),
});

export default UpdateMeDto;
export type UpdateMeDto = z.infer<typeof UpdateMeDto>;
