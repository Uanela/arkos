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

// Function to remove the beginning slash
export function removeBeginningSlash(str: string) {
  if (str.startsWith("/")) return str.substring(1);

  return str;
}

// Function to remove the ending slash
export function removeEndingSlash(str: string) {
  if (str.endsWith("/")) return str.substring(0, str.length - 1);

  return str;
}

// Function to remove both beginning and ending slashes
export function removeBothSlashes(str: string) {
  return removeEndingSlash(removeBeginningSlash(str));
}
