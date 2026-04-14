import { z } from "zod";

const AuthorSchema = z.object({
  id: z.string(),
  createdAt: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date'),
  updatedAt: z.date().or(z.string()).refine((val) => val instanceof Date || !isNaN(Date.parse(val)), 'Invalid date')
});

export default AuthorSchema;

export type AuthorSchemaType = z.infer<typeof AuthorSchema>;
