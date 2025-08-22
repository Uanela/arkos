import { PrismaQueryOptions, AuthPrismaQueryOptions } from "../../types";
import { getModels } from "../../utils/helpers/dynamic-loader";

export {
  PrismaQueryOptions,
  getModels as getPrismaModels,
  AuthPrismaQueryOptions,
};
