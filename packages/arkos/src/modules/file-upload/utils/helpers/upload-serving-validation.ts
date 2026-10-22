import ExitError from "../../../../utils/helpers/exit-error";
import sheu from "../../../../utils/sheu";
import { getArkosConfig } from "../../../../server";
import { extractPathParams } from "../../../../utils/arkos-router/utils/helpers";
import type { UploadUrlPath } from "../../../../types/upload";
import {
  DEFAULT_UPLOAD_DIRS,
  assertSafeUploadPath,
  normalizeUploadDir,
  normalizeUploadUrlPath,
} from "./upload-path.helper";
import {
  uploadServingRegistry,
  UploadServeRegistration,
  UploadWriteRegistration,
} from "./upload-serving.registry";

type TemplateMatch = {
  params: Record<string, string>;
  matched: number;
  remaining: string[];
};

function isExactUrlPath(
  urlPath: UploadUrlPath | undefined
): urlPath is { exact: string } {
  return !!urlPath && typeof urlPath === "object";
}

function normalizeBaseRoute(baseRoute: string): string {
  const withLeadingSlash = baseRoute.startsWith("/")
    ? baseRoute
    : `/${baseRoute}`;

  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : withLeadingSlash;
}

function assertUrlPathIsRelativeToBaseRoute(
  urlPath: string,
  baseRoute: string,
  route: string
) {
  const normalizedBaseRoute = normalizeBaseRoute(baseRoute);

  if (
    urlPath === normalizedBaseRoute ||
    urlPath.startsWith(`${normalizedBaseRoute}/`)
  )
    throw ExitError(
      `Invalid urlPath "${urlPath}" on route "${route}": it is relative to baseRoute and must not include "${normalizedBaseRoute}".`
    );
}

function substitutePath(
  pathTemplate: string,
  params: Record<string, string>
): string {
  return pathTemplate
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? params[segment.slice(1)] : segment
    )
    .join("/");
}

function matchDirTemplates(
  serveDir: string,
  writeDir: string,
  recursive: boolean
): TemplateMatch | null {
  const serveSegments = normalizeUploadDir(serveDir).split("/");
  const writeSegments = normalizeUploadDir(writeDir).split("/");

  if (serveSegments.length > writeSegments.length) return null;
  if (serveSegments.length < writeSegments.length && !recursive) return null;

  const params: Record<string, string> = {};

  for (let index = 0; index < serveSegments.length; index++) {
    const serveSegment = serveSegments[index];
    const writeSegment = writeSegments[index];

    if (serveSegment.startsWith(":")) {
      if (writeSegment.startsWith(":")) {
        if (serveSegment.slice(1) !== writeSegment.slice(1)) return null;
      } else params[serveSegment.slice(1)] = writeSegment;
    } else if (serveSegment !== writeSegment) return null;
  }

  return {
    params,
    matched: serveSegments.length,
    remaining: writeSegments.slice(serveSegments.length),
  };
}

function validateWriteUrlPath(
  registration: UploadWriteRegistration,
  baseRoute: string
) {
  const { urlPath, route, dir } = registration;

  if (urlPath === undefined) return;

  if (!dir)
    throw ExitError(
      `Route "${route}" declares urlPath but does not declare uploadDir.`
    );

  if (isExactUrlPath(urlPath)) {
    const exact = urlPath.exact;

    if (typeof exact !== "string" || !exact.startsWith("/"))
      throw ExitError(
        `Invalid exact urlPath on route "${route}": it must be a string starting with "/".`
      );

    if (exact.length > 1 && exact.endsWith("/"))
      throw ExitError(
        `Invalid exact urlPath "${exact}" on route "${route}": it must not end with "/".`
      );

    if (exact === "/")
      throw ExitError(
        `Invalid exact urlPath "/" on route "${route}": it must contain at least one segment.`
      );

    assertSafeUploadPath(exact.replace(/^\//, ""), {
      label: "exact upload urlPath",
    });

    assertUrlPathIsRelativeToBaseRoute(exact, baseRoute, route);

    if (registration.type === "array")
      throw ExitError(
        `Exact urlPath "${exact}" on route "${route}" cannot be used with array uploads because every file would share the same URL.`
      );

    return;
  }

  if (!urlPath.startsWith("/"))
    throw ExitError(
      `Invalid urlPath "${urlPath}" on route "${route}": it must start with "/".`
    );

  if (urlPath.endsWith("/"))
    throw ExitError(
      `Invalid urlPath "${urlPath}" on route "${route}": it must not end with "/".`
    );

  assertSafeUploadPath(urlPath.replace(/^\//, ""), {
    allowParams: true,
    label: "upload urlPath",
  });

  assertUrlPathIsRelativeToBaseRoute(urlPath, baseRoute, route);
}

function warnAboutUnusedUrlParams(
  dir: string,
  urlPath: string,
  route: string,
  suppress: boolean
) {
  if (suppress) return;

  const dirParams = extractPathParams(`/${dir}`);
  const unused = extractPathParams(urlPath).filter(
    (param) => !dirParams.includes(param)
  );

  if (unused.length > 0)
    sheu.warn(
      `Upload urlPath "${urlPath}" on route "${route}" declares ${unused
        .map((param) => `":${param}"`)
        .join(", ")} but uploadDir "${dir}" does not use them.`,
      { timestamp: true }
    );
}

/**
 * Validates the upload serving registrations collected while building the
 * routers. Must run once, after every router has been constructed.
 */
export function validateUploadServingConfig() {
  const config = getArkosConfig();
  const serving = config.fileUpload?.serving || "all";
  const findFileEnabled = uploadServingRegistry.isFindFileServingEnabled();
  const baseRoute = config.fileUpload?.baseRoute || "/api/uploads";
  const suppressUnusedUrlParams =
    config.warnings?.fileUpload?.suppressUnusedUrlParams === true;
  const serveRegistrations = uploadServingRegistry.getServeRegistrations();
  const writeRegistrations = uploadServingRegistry.getWriteRegistrations();

  const seenServePaths = new Map<string, string>();
  const seenServeDirs = new Map<string, string>();
  const seenExactWritePaths = new Map<string, string>();
  const warnedRoutes = new Set<string>();

  for (const registration of serveRegistrations) {
    const dir = normalizeUploadDir(registration.dir);
    const publicPath = normalizeUploadUrlPath(registration.urlPath);
    const firstDirSegment = dir.split("/")[0];
    const firstPathSegment = publicPath.replace(/^\//, "").split("/")[0];

    if (registration.dynamic && !registration.hasPrepare)
      throw ExitError(
        `Dynamic upload directory "${dir}" requires a prepare function.`
      );

    if (registration.pathParams.length > 0 && !suppressUnusedUrlParams) {
      const unused = registration.pathParams.filter(
        (param) => !registration.dirParams.includes(param)
      );

      if (unused.length > 0)
        sheu.warn(
          `Upload URL path "${publicPath}" declares ${unused
            .map((param) => `":${param}"`)
            .join(", ")} but the upload directory "${dir}" does not use them.`,
          { timestamp: true }
        );
    }

    if (
      findFileEnabled &&
      (DEFAULT_UPLOAD_DIRS as readonly string[]).includes(firstDirSegment)
    )
      throw ExitError(
        `Cannot serve upload directory "${dir}" with arkos.serveUploadDir(): "${firstDirSegment}" is a built-in upload root and is always served while findFile is enabled.`
      );

    if (
      findFileEnabled &&
      (DEFAULT_UPLOAD_DIRS as readonly string[]).includes(firstPathSegment)
    )
      throw ExitError(
        `Cannot register upload URL path "${publicPath}": "/${firstPathSegment}" is a built-in upload root and is always served while findFile is enabled.`
      );

    if (seenServePaths.has(publicPath))
      throw ExitError(
        `Duplicate upload serving path "${publicPath}" registered with arkos.serveUploadDir().`
      );

    seenServePaths.set(publicPath, dir);

    if (seenServeDirs.has(dir))
      throw ExitError(
        seenServeDirs.get(dir) === publicPath
          ? `Duplicate arkos.serveUploadDir() registration for "${dir}".`
          : `Upload directory "${dir}" is served at multiple paths: "${seenServeDirs.get(
              dir
            )}" and "${publicPath}".`
      );

    seenServeDirs.set(dir, publicPath);
  }

  let warnedAboutAllMode = false;

  for (const registration of writeRegistrations) {
    const dir = registration.dir
      ? normalizeUploadDir(registration.dir)
      : undefined;

    validateWriteUrlPath(registration, baseRoute);

    if (!dir) continue;

    assertSafeUploadPath(dir, { allowParams: true, label: "uploadDir" });

    const dirParams = extractPathParams(`/${dir}`);

    if (dirParams.length > 0 && !registration.hasPrepare)
      throw ExitError(
        `Dynamic upload directory "${dir}" on route "${registration.route}" requires a prepare function.`
      );

    if (
      registration.urlPath !== undefined &&
      !isExactUrlPath(registration.urlPath)
    ) {
      const warningKey = `${registration.route}:${dir}:${registration.urlPath}`;

      if (!warnedRoutes.has(warningKey)) {
        warnAboutUnusedUrlParams(
          dir,
          registration.urlPath,
          registration.route,
          suppressUnusedUrlParams
        );
        warnedRoutes.add(warningKey);
      }
    }

    if (isExactUrlPath(registration.urlPath)) {
      const exact = registration.urlPath.exact;

      if (seenExactWritePaths.has(exact))
        throw ExitError(
          `Duplicate exact urlPath "${exact}" on route "${registration.route}"; it is already used on route "${seenExactWritePaths.get(
            exact
          )}".`
        );

      seenExactWritePaths.set(exact, registration.route);
      continue;
    }

    const firstDirSegment = dir.split("/")[0];

    if (
      findFileEnabled &&
      (DEFAULT_UPLOAD_DIRS as readonly string[]).includes(firstDirSegment)
    )
      continue;

    if (serving === "all") {
      if (!warnedAboutAllMode && serveRegistrations.length > 0) {
        warningAboutAllMode();
        warnedAboutAllMode = true;
      }
      continue;
    }

    if (registration.serve === false) continue;

    const writePublicPath = normalizeUploadUrlPath(
      registration.urlPath ?? `/${dir}`
    );

    let bestMatch:
      | { registration: UploadServeRegistration; match: TemplateMatch }
      | undefined;

    for (const serveRegistration of serveRegistrations) {
      const match = matchDirTemplates(
        serveRegistration.dir,
        dir,
        serveRegistration.recursive
      );

      if (!match) continue;

      if (!bestMatch || match.matched > bestMatch.match.matched) {
        bestMatch = { registration: serveRegistration, match };
        continue;
      }

      if (
        match.matched === bestMatch.match.matched &&
        normalizeUploadUrlPath(serveRegistration.urlPath) !==
          normalizeUploadUrlPath(bestMatch.registration.urlPath)
      )
        throw ExitError(
          `Upload directory "${dir}" on route "${registration.route}" is ambiguously served by "${bestMatch.registration.urlPath}" and "${serveRegistration.urlPath}".`
        );
    }

    if (!bestMatch)
      throw ExitError(
        `Upload directory "${dir}" used by route "${registration.route}" is not served. Register it with arkos.serveUploadDir("${dir}") or set uploads.serve = false.`
      );

    const servedPublicPath = normalizeUploadUrlPath(
      `${substitutePath(bestMatch.registration.urlPath, bestMatch.match.params)}${
        bestMatch.match.remaining.length
          ? `/${bestMatch.match.remaining.join("/")}`
          : ""
      }`
    );

    if (servedPublicPath !== writePublicPath)
      throw ExitError(
        `Generated URL "${writePublicPath}" does not match served URL "${servedPublicPath}" for upload directory "${dir}".`
      );
  }

  if (
    serving === "all" &&
    serveRegistrations.length > 0 &&
    !warnedAboutAllMode
  )
    warningAboutAllMode();
}

function warningAboutAllMode() {
  sheu.warn(
    `fileUpload.serving is "all"; per-folder permissions registered via arkos.serveUploadDir() are not enforced.`,
    { timestamp: true }
  );
}
