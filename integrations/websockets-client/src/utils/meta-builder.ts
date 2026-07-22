import { ArkosMetaEnvelope } from "../types";

/**
 * Generates a RFC4122 v4 UUID without external deps.
 */
function uuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Builds the _meta envelope ArkosGateway expects for dedup and maxAge checks.
 */
export function buildMeta(): ArkosMetaEnvelope {
  return {
    mid: uuid(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wraps a payload with _meta for ArkosGateway consumption.
 */
export function wrapWithMeta<T extends Record<string, any>>(
  data: T
): T & { _meta: ArkosMetaEnvelope } {
  return { ...data, _meta: buildMeta() };
}
