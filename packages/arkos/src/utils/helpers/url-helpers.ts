export function lenientDecode(str: string) {
  return str.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => {
    try {
      return decodeURIComponent("%" + hex);
    } catch {
      return String.fromCharCode(parseInt(hex, 16));
    }
  });
}
