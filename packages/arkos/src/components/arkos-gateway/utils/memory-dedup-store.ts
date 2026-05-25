import { ArkosGatewayDedupStore } from "../types";

export class MemoryDedupStore implements ArkosGatewayDedupStore {
  private store = new Map<string, NodeJS.Timeout>();

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async set(key: string, ttl: number): Promise<void> {
    if (this.store.has(key)) clearTimeout(this.store.get(key)!);

    const timer = setTimeout(() => {
      this.store.delete(key);
    }, ttl * 1000);

    // prevent timer from blocking process exit
    timer.unref();
    this.store.set(key, timer);
  }
}

export const memoryDedupStore = new MemoryDedupStore();
