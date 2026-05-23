import { Options as RateLimitOptions } from "express-rate-limit";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store: socketId → event → entry
// TODO: use mult-tier with bento (or whatever)
const store = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Cleans up rate limit entries for a disconnected socket.
 */
export function clearRateLimitForSocket(socketId: string) {
  store.delete(socketId);
}

/**
 * Checks whether a socket has exceeded the rate limit for a given event.
 * Returns true if the request is allowed, false if rate limited.
 */
export function checkRateLimit(
  socketId: string,
  event: string,
  options: Partial<RateLimitOptions>
): { allowed: boolean; retryAfter?: number } {
  const windowMs = (options.windowMs as number) ?? 60_000;
  const max = (options.max as number) ?? 100;
  const now = Date.now();

  if (!store.has(socketId)) store.set(socketId, new Map());
  const socketStore = store.get(socketId)!;

  if (!socketStore.has(event) || socketStore.get(event)!.resetAt <= now) {
    socketStore.set(event, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  const entry = socketStore.get(event)!;
  entry.count++;

  if (entry.count > max)
    return { allowed: false, retryAfter: entry.resetAt - now };

  return { allowed: true };
}
