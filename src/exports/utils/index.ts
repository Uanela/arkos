import { capitalize } from "../../utils/helpers/text.helpers";
import { getModels } from "../../utils/helpers/models.helpers";

/**
 * A collection of utility functions.
 *
 * @namespace utils
 * @property {Function} capitalize - Capitalizes the first letter of each word in a string.
 * @property {Function} getPrismaModels - Retrieves Prisma models dynamically.
 */
export const utils = {
  capitalize,
  getPrismaModels: getModels,
};

export { capitalize, getModels as getPrismaModels };
export default utils;
