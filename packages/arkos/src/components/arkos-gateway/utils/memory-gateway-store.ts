import { ArkosGatewayStore } from "../types";

export class MemoryGatewayStore implements ArkosGatewayStore {
  private rl = new Map<string, { count: number; resetAt: number }>();
  private dedup = new Map<string, NodeJS.Timeout>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const entry = this.rl.get(key);
    if (!entry || entry.resetAt <= now) {
      const next = { count: 1, resetAt: now + windowMs };
      this.rl.set(key, next);
      return next;
    }
    entry.count++;
    return entry;
  }

  async clear(prefix: string) {
    for (const key of this.rl.keys())
      if (key.startsWith(prefix)) this.rl.delete(key);
    for (const [key, timer] of this.dedup)
      if (key.startsWith(prefix)) {
        clearTimeout(timer);
        this.dedup.delete(key);
      }
  }

  async has(key: string) {
    return this.dedup.has(key);
  }

  async set(key: string, ttl: number) {
    if (this.dedup.has(key)) clearTimeout(this.dedup.get(key)!);
    const timer = setTimeout(() => this.dedup.delete(key), ttl * 1000);
    timer.unref();
    this.dedup.set(key, timer);
  }
}

export const defaultGatewayStore = new MemoryGatewayStore();
