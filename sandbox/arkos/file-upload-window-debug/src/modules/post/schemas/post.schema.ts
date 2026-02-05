import { z } from "zod";
import { PostType } from "@prisma/client";

const PostSchema = z.object({
  id: z.string(),
  createdAt: z
    .date()
    .or(z.string())
    .refine(
      (val) => val instanceof Date || !isNaN(Date.parse(val)),
      "Invalid date"
    ),
  updatedAt: z
    .date()
    .or(z.string())
    .refine(
      (val) => val instanceof Date || !isNaN(Date.parse(val)),
      "Invalid date"
    ),
  userId: z.string(),
  userId2: z.string(),
  type: z.nativeEnum(PostType),
});

export default PostSchema;

export type PostSchemaType = z.infer<typeof PostSchema>;
