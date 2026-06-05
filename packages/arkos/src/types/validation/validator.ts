import { ZodSchema } from "zod";

export type Validator =
  | ZodSchema
  | (new (...args: any[]) => object)
  | null
  | false;
