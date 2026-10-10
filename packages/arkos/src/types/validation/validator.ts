import { ZodType } from "zod";

export type Validator =
  ZodType | (new (...args: any[]) => object) | null | false;

