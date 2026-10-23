import fs from "fs";
import path from "path";

export const DEFAULT_UPLOAD_DIRS = [
  "images",
  "videos",
  "documents",
  "files",
] as const;

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PARAM_SEGMENT = /^:[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

export function isSafeUploadSegment(
  segment: string,
  allowParam = false
): boolean {
  if (!segment) return false;
  if (allowParam && PARAM_SEGMENT.test(segment)) return true;
  if (!SAFE_SEGMENT.test(segment)) return false;
  if (segment === "." || segment === "..") return false;
  if (/[. ]$/.test(segment)) return false;
  if (RESERVED_WINDOWS_NAMES.test(segment)) return false;
  return true;
}

export function assertSafeUploadPath(
  value: string,
  options: { allowParams?: boolean; label?: string } = {}
) {
  const label = options.label || "upload path";

  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Invalid ${label}: it must be a non-empty string.`);

  if (path.isAbsolute(value))
    throw new Error(
      `Invalid ${label} "${value}": absolute paths are not allowed.`
    );

  if (value.includes("\\") || value.includes("\0"))
    throw new Error(
      `Invalid ${label} "${value}": backslashes and null bytes are not allowed.`
    );

  for (const segment of value.split("/")) {
    if (!segment || segment === "." || segment === "..")
      throw new Error(
        `Invalid ${label} "${value}": empty, "." and ".." segments are not allowed.`
      );

    if (!isSafeUploadSegment(segment, options.allowParams))
      throw new Error(
        `Invalid ${label} "${value}": segment "${segment}" is not allowed. Use letters, numbers, ".", "_" and "-".`
      );
  }

  return value;
}

export function normalizeUploadDir(dir: string): string {
  return dir.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function normalizeUploadUrlPath(urlPath: string): string {
  let result = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  if (result.length > 1) result = result.replace(/\/+$/, "");
  return result;
}

export function isSafeUploadParam(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    SAFE_SEGMENT.test(value) &&
    value !== "." &&
    value !== ".." &&
    !/[. ]$/.test(value) &&
    !RESERVED_WINDOWS_NAMES.test(value)
  );
}

export function isPathInside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function resolveUploadPath(
  root: string,
  relative: string,
  options: { strictSegments?: boolean } = {}
): string | null {
  if (typeof relative !== "string") return null;

  const cleaned = relative.replace(/^\/+/, "");
  if (cleaned.includes("\0") || cleaned.includes("\\")) return null;
  if (cleaned === "") return path.resolve(root);

  for (const segment of cleaned.split("/")) {
    if (!segment || segment === "." || segment === "..") return null;
    if (options.strictSegments && !isSafeUploadSegment(segment)) return null;
  }

  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...cleaned.split("/"));

  if (!isPathInside(resolvedRoot, resolved)) return null;

  return resolved;
}

export async function isRealPathInside(
  base: string,
  target: string
): Promise<boolean> {
  try {
    const [realBase, realTarget] = await Promise.all([
      fs.promises.realpath(base),
      fs.promises.realpath(target),
    ]);

    return isPathInside(realBase, realTarget);
  } catch (error: any) {
    if (error?.code === "ENOENT") return true;
    return false;
  }
}
