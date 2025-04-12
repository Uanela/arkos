declare namespace deepmerge {
  export interface Options {
    arrayMerge?(
      target: any[],
      source: any[],
      options?: ArrayMergeOptions
    ): any[];
    clone?: boolean;
    customMerge?: (
      key: string,
      options?: Options
    ) => ((x: any, y: any) => any) | undefined;
    isMergeableObject?(value: object): boolean;
    cloneUnlessOtherwiseSpecified?(value: any, options?: Options): any;
  }

  export interface ArrayMergeOptions extends Options {
    cloneUnlessOtherwiseSpecified(value: any, options?: Options): any;
  }
}

function isMergeableObject(value: any): boolean {
  return isNonNullObject(value) && !isSpecial(value);
}

function isNonNullObject(value: any): boolean {
  return !!value && typeof value === "object";
}

function isSpecial(value: any): boolean {
  const stringValue = Object.prototype.toString.call(value);

  return stringValue === "[object RegExp]" || stringValue === "[object Date]";
}

function emptyTarget(val: any): any {
  return Array.isArray(val) ? [] : {};
}

function getKeys(target: any): (string | symbol)[] {
  const objectKeys = Object.keys(target);
  const symbolKeys = getEnumerableOwnPropertySymbols(target);
  return [...objectKeys, ...symbolKeys];
}

function getEnumerableOwnPropertySymbols(target: any): symbol[] {
  return Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(target).filter(function (symbol) {
        return Object.propertyIsEnumerable.call(target, symbol);
      })
    : [];
}

function cloneUnlessOtherwiseSpecified(
  value: any,
  options: deepmerge.Options
): any {
  return options.clone !== false && options.isMergeableObject?.(value)
    ? deepmerge(emptyTarget(value), value, options)
    : value;
}

function defaultArrayMerge(
  target: any[],
  source: any[],
  options: deepmerge.ArrayMergeOptions
): any[] {
  return target.concat(source).map(function (element) {
    return options.cloneUnlessOtherwiseSpecified(element, options);
  });
}

function getMergeFunction(
  key: string,
  options: deepmerge.Options
): (x: any, y: any, options?: deepmerge.Options) => any {
  if (!options.customMerge) {
    return deepmerge;
  }
  const customMerge = options.customMerge(key);
  return typeof customMerge === "function" ? customMerge : deepmerge;
}

function propertyIsOnObject(object: any, property: string | symbol): boolean {
  try {
    return property in object;
  } catch (_) {
    return false;
  }
}

function propertyIsUnsafe(target: any, key: string | symbol): boolean {
  return (
    propertyIsOnObject(target, key) &&
    !(
      Object.hasOwnProperty.call(target, key) &&
      Object.propertyIsEnumerable.call(target, key)
    )
  );
}

function mergeObject(
  target: any,
  source: any,
  options: deepmerge.Options
): any {
  const destination: any = {};
  if (options.isMergeableObject?.(target)) {
    getKeys(target).forEach(function (key) {
      destination[key] = options.cloneUnlessOtherwiseSpecified
        ? options.cloneUnlessOtherwiseSpecified(target[key], options)
        : target[key];
    });
  }
  getKeys(source).forEach(function (key) {
    if (propertyIsUnsafe(target, key)) {
      return;
    }

    if (
      propertyIsOnObject(target, key) &&
      options.isMergeableObject?.(source[key])
    ) {
      destination[key] = getMergeFunction(key as string, options)(
        target[key],
        source[key],
        options
      );
    } else {
      destination[key] = options.cloneUnlessOtherwiseSpecified
        ? options.cloneUnlessOtherwiseSpecified(source[key], options)
        : source[key];
    }
  });
  return destination;
}

function deepmerge<T>(
  target: Partial<T>,
  source: Partial<T>,
  options?: deepmerge.Options
): T;
function deepmerge<T1, T2>(
  target: Partial<T1>,
  source: Partial<T2>,
  options?: deepmerge.Options
): T1 & T2;
function deepmerge(target: any, source: any, options?: deepmerge.Options): any {
  options = options || {};

  // Ensure default implementations
  const mergeOptions: deepmerge.ArrayMergeOptions = {
    arrayMerge: options.arrayMerge || defaultArrayMerge,
    isMergeableObject: options.isMergeableObject || isMergeableObject,
    cloneUnlessOtherwiseSpecified:
      options.cloneUnlessOtherwiseSpecified || cloneUnlessOtherwiseSpecified,
    clone: options.clone,
    customMerge: options.customMerge,
  };

  const sourceIsArray = Array.isArray(source);
  const targetIsArray = Array.isArray(target);
  const sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

  if (!sourceAndTargetTypesMatch) {
    return mergeOptions.cloneUnlessOtherwiseSpecified(source, mergeOptions);
  } else if (sourceIsArray) {
    return mergeOptions.arrayMerge?.(target, source, mergeOptions);
  } else {
    return mergeObject(target, source, mergeOptions);
  }
}

function deepmergeAll<T extends Record<string, any> = Record<string, any>>(
  array: ReadonlyArray<T>,
  options?: deepmerge.Options
): T {
  if (!Array.isArray(array)) {
    throw new Error("first argument should be an array");
  }

  return array.reduce((prev, next) => {
    return deepmerge(prev, next, options);
  }, {} as T);
}

deepmerge.all = deepmergeAll;

export default deepmerge;
