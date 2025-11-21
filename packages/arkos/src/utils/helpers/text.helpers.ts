/**
 * Capitalizes the first letter of each word in the input text.
 * The function splits the text by spaces, capitalizes the first letter of each word,
 * and ensures the rest of each word is in lowercase.
 *
 * @param {string} text - The input string to capitalize.
 * @returns {string} The input string with each word capitalized.
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Removes the leading slash from a string if present.
 *
 * @param {string} str - The input string to process
 * @returns {string} The string without a leading slash
 *
 * @example
 * removeBeginningSlash("/api/users") // Returns "api/users"
 * removeBeginningSlash("api/users")  // Returns "api/users"
 */
export function removeBeginningSlash(str: string) {
  if (str.startsWith("/")) return str.substring(1);

  return str;
}

/**
 * Removes the trailing slash from a string if present.
 *
 * @param {string} str - The input string to process
 * @returns {string} The string without a trailing slash
 *
 * @example
 * removeEndingSlash("api/users/") // Returns "api/users"
 * removeEndingSlash("api/users")  // Returns "api/users"
 */
export function removeEndingSlash(str: string) {
  if (str.endsWith("/")) return str.substring(0, str.length - 1);

  return str;
}

/**
 * Removes both leading and trailing slashes from a string.
 *
 * @param {string} str - The input string to process
 * @returns {string} The string without leading or trailing slashes
 *
 * @example
 * removeBothSlashes("/api/users/") // Returns "api/users"
 * removeBothSlashes("/api/users")  // Returns "api/users"
 * removeBothSlashes("api/users/")  // Returns "api/users"
 */
export function removeBothSlashes(str: string) {
  return removeEndingSlash(removeBeginningSlash(str));
}