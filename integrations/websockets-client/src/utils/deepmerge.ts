export default function deepmerge<T extends Record<string, any>>(
  ...objects: Partial<T>[]
): T {
  return objects.reduce((result: any, current) => {
    for (const key of Object.keys(current) as (keyof T)[]) {
      const resultVal = result[key];
      const currentVal = current[key];

      if (isPlainObject(resultVal) && isPlainObject(currentVal)) {
        result[key] = deepmerge(resultVal, currentVal);
      } else if (Array.isArray(resultVal) && Array.isArray(currentVal)) {
        result[key] = [...resultVal, ...currentVal] as T[keyof T];
      } else {
        result[key] = currentVal as T[keyof T];
      }
    }
    return result;
  }, {} as T);
}

function isPlainObject(val: unknown): val is Record<string, any> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
