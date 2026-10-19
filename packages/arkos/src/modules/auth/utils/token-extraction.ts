export const ACCESS_TOKEN_COOKIE_NAME = "arkos_access_token";
export const NO_TOKEN_SENTINEL = "no-token";

export type CookieMap = Record<string, string>;

/** Returns the trimmed token if it is non-empty, otherwise `null`. */
export function normalizeToken(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const token = value.trim();
  return token || null;
}

/**
 * Reads a token from an already-parsed cookie map (e.g. Express's `req.cookies`).
 * Arkos writes the `no-token` sentinel on logout, so it counts as absent.
 */
export function getCookieToken(
  cookies: Record<string, unknown> | undefined,
  cookieName: string = ACCESS_TOKEN_COOKIE_NAME,
): string | null {
  if (!cookies) return null;

  const token = normalizeToken(cookies[cookieName]);
  return token === NO_TOKEN_SENTINEL ? null : token;
}

/**
 * Parses a raw `Cookie` header without requiring cookie-parser.
 * Values may contain `=`; malformed pairs are skipped.
 */
export function parseCookieHeader(
  cookieHeader?: string | null,
): CookieMap {
  const cookies: CookieMap = {};

  if (!cookieHeader || typeof cookieHeader !== "string") return cookies;

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;

    const key = pair.slice(0, separator).trim();
    if (!key) continue;

    let value: string;
    try {
      value = decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      continue;
    }

    cookies[key] = value;
  }

  return cookies;
}

/**
 * Extracts a bearer token from an `Authorization` header.
 *
 * The default mode is case-insensitive and tolerates a missing space after
 * `Bearer`. Pass `{ caseInsensitive: false }` to preserve the legacy HTTP
 * behavior exactly.
 */
export function extractBearerToken(
  authorization?: string | null,
  { caseInsensitive = true }: { caseInsensitive?: boolean } = {},
): string | null {
  if (!authorization || typeof authorization !== "string") return null;

  if (!caseInsensitive) {
    if (!authorization.startsWith("Bearer")) return null;
    return normalizeToken(authorization.split(" ")[1]);
  }

  const match = /^Bearer\s*(.*)$/i.exec(authorization.trim());
  return match ? normalizeToken(match[1]) : null;
}

export interface RequestTokenSources {
  authorization?: string;
  cookies?: Record<string, unknown>;
  cookieName?: string;
}

/**
 * Resolves the token for an HTTP request-like object.
 * Precedence: `Authorization` header, then the access-token cookie.
 */
export function resolveRequestToken({
  authorization,
  cookies,
  cookieName = ACCESS_TOKEN_COOKIE_NAME,
}: RequestTokenSources): string | null {
  return (
    extractBearerToken(authorization, { caseInsensitive: false }) ??
    getCookieToken(cookies, cookieName)
  );
}

export interface SocketTokenSources {
  auth?: Record<string, unknown>;
  key?: string;
  headers?: {
    authorization?: string;
    cookie?: string;
  };
  /** Pre-parsed cookies, when available. */
  cookies?: CookieMap;
  /** Raw `Cookie` header, used when `cookies` is not provided. */
  cookieHeader?: string;
  cookieName?: string;
}

/**
 * Resolves the token for a Socket.IO connection.
 * Precedence: `handshake.auth.token`, `Authorization` header, access-token cookie.
 */
export function resolveSocketToken({
  auth,
  key = "token",
  headers,
  cookies,
  cookieHeader,
  cookieName = ACCESS_TOKEN_COOKIE_NAME,
}: SocketTokenSources): string | null {
  return (
    normalizeToken(auth?.[key]) ??
    extractBearerToken(headers?.authorization) ??
    getCookieToken(
      cookies ?? parseCookieHeader(cookieHeader ?? headers?.cookie),
      cookieName,
    )
  );
}
