import { Options as RateLimitOptions } from "express-rate-limit";
import { ArkosGatewayStore } from "../types";

/**
 * Checks whether a socket has exceeded the rate limit for a given event.
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  socketId: string,
  event: string,
  options: Partial<RateLimitOptions>,
  store: ArkosGatewayStore
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const windowMs = (options.windowMs as number) ?? 60_000;
  const max = (options.max as number) ?? 100;
  const key = `arkos::rl:${socketId}:${event}`;

  const { count, resetAt } = await store.increment(key, windowMs);

  if (count > max) return { allowed: false, retryAfter: resetAt - Date.now() };

  return { allowed: true };
}

export async function clearRateLimitForSocket(
  socketId: string,
  store: ArkosGatewayStore
) {
  await store.clear(`arkos::rl:${socketId}`);
}
