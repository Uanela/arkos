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
