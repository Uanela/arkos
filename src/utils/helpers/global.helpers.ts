export async function importModule(path: string) {
  return await import(path);
}

export function cleanProcessCwd() {}
