import { PrismaQueryOptions, AuthPrismaQueryOptions } from "../../types";
import { getModels } from "../../utils/dynamic-loader";

export {
  PrismaQueryOptions,
  getModels as getPrismaModels,
  AuthPrismaQueryOptions,
};
