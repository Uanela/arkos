import { ArkosGatewayStore } from "../types";

/**
 * Multi-tier store that chains multiple stores together.
 * Writes go to all tiers. Reads check tiers in order, promoting hits to faster tiers.
 *
 * @example
 * new MultiTierArkosStore([new MemoryArkosStore(), new RedisArkosStore(redis)])
 */
export class MultiTierArkosGatewayStore implements ArkosGatewayStore {
  constructor(private tiers: ArkosGatewayStore[]) {}

  async increment(key: string, windowMs: number) {
    // L1 first — if valid, sync to slower tiers and return
    const l1 = await this.tiers[0].increment(key, windowMs);
    for (const tier of this.tiers.slice(1)) tier.increment(key, windowMs);
    return l1;
  }

  async clear(prefix: string) {
    await Promise.all(this.tiers.map((t) => t.clear(prefix)));
  }

  async has(key: string) {
    for (const tier of this.tiers) {
      if (await tier.has(key)) return true;
    }
    return false;
  }

  async set(key: string, ttl: number) {
    await Promise.all(this.tiers.map((t) => t.set(key, ttl)));
  }

  async setIfNotExists(key: string, ttl: number): Promise<boolean> {
    for (const tier of this.tiers) {
      const acquired = await tier.setIfNotExists(key, ttl);

      if (acquired) {
        for (const t of this.tiers) {
          if (t !== tier) {
            t.set(key, ttl).catch(() => {});
          }
        }

        return true;
      }
    }

    return false;
  }
}
