import { ArkosNextFunction, ArkosRequest, ArkosResponse } from "../../types";
import { parseQueryParamsWithModifiers } from "./api.features.helpers";

type ParsedQuery = any;

export interface Options {
  parseNull?: boolean;
  parseUndefined?: boolean;
  parseBoolean?: boolean;
  parseNumber?: boolean;
  parseDoubleUnderscore?: boolean;
}

function parseDoubleUnderscore(
  query: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(query)) {
    const parts = key.split("__");

    if (parts.length === 1) {
      result[key] = value;
    } else {
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    }
  }

  return result;
}

export const parse = (target: ParsedQuery, options: Options): ParsedQuery => {
  switch (typeof target) {
    case "string":
      if (target === "") {
        return "";
      } else if (options.parseNull && target === "null") {
        return null;
      } else if (options.parseUndefined && target === "undefined") {
        return undefined;
      } else if (
        options.parseBoolean &&
        (target === "true" || target === "false")
      ) {
        return target === "true";
      } else if (options.parseNumber && !isNaN(Number(target))) {
        return Number(target);
      } else if (options.parseNumber && !isNaN(Number(target))) {
        return parseQueryParamsWithModifiers(target as any);
      } else {
        return target;
      }
    case "object":
      if (Array.isArray(target)) {
        return target.map((x) => parse(x, options));
      } else {
        const obj = target;
        Object.keys(obj).map((key) => (obj[key] = parse(target[key], options)));
        return obj;
      }
    default:
      return target;
  }
};

export const queryParser =
  (options: Options) =>
  (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    req.query = parse(req.query, options);
    next();
  };
