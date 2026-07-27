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
    (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
      Object.defineProperty(req, "query", {
        value: parse(req.query, options),
        writable: false,
        configurable: true,
        enumerable: true,
      });

      next();
    };
