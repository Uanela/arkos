import { AuthPrismaQueryOptions, PrismaQueryOptions } from "../../../../types";
import deepmerge from "../../../../utils/helpers/deepmerge.helper";
import { ControllerActions } from "../../base.middlewares";

/**
 * Helper function to resolve and merge Prisma query options based on action and general options
 *
 * @template T - The type of the Prisma model
 * @param {PrismaQueryOptions<T> | AuthPrismaQueryOptions<T>} prismaQueryOptions - The Prisma query options
 * @param {ControllerActions} action - The controller action to apply
 * @returns {Record<string, any>} The merged query options for the specific action
 */
export function resolvePrismaQueryOptions<T extends Record<string, any>>(
  prismaQueryOptions: PrismaQueryOptions<T> | AuthPrismaQueryOptions<T>,
  action: ControllerActions
): Record<string, any> {
  if (!prismaQueryOptions) {
    return {};
  }

  const options = prismaQueryOptions as any;
  const actionOptions = options[action] || {};

  let mergedOptions = options.queryOptions || {};

  if (options.global) mergedOptions = deepmerge(mergedOptions, options.global);

  const generalOptions = getGeneralOptionsForAction(options, action);
  if (generalOptions) {
    mergedOptions = deepmerge(mergedOptions, generalOptions);
  }

  if (actionOptions) mergedOptions = deepmerge(mergedOptions, actionOptions);

  return mergedOptions;
}

/**
 * Helper function to get general options based on the action type
 *
 * @param {any} options - The Prisma query options object
 * @param {ControllerActions} action - The controller action
 * @returns {Record<string, any> | null} The general options for the action type
 */
function getGeneralOptionsForAction(
  options: any,
  action: ControllerActions
): Record<string, any> | null {
  // Map actions to their general option categories
  const actionMappings: Record<string, string[]> = {
    // Find operations
    findMany: ["find"],
    findOne: ["find"],

    // Create operations
    create: ["create", "save"],
    createOne: ["create", "save", "saveOne"],
    createMany: ["create", "save", "saveMany"],

    // Update operations
    update: ["update", "save"],
    updateOne: ["update", "save", "saveOne"],
    updateMany: ["update", "save", "saveMany"],

    // Delete operations
    delete: ["delete"],
    deleteOne: ["delete"],
    deleteMany: ["delete"],
  };

  const generalKeys = actionMappings[action] || [];
  let generalOptions = {};

  // Merge all applicable general options in order of precedence
  for (const key of generalKeys) {
    if (options[key]) {
      generalOptions = deepmerge(generalOptions, options[key]);
    }
  }

  return Object.keys(generalOptions).length > 0 ? generalOptions : null;
}
