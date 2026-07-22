/**
 * Lightweight in-memory deduplication store for received events.
 * Guards against reconnect replay or server retry storms delivering
 * the same logical event twice to the client.
 */
export class ClientDedupStore {
  private store = new Map<string, number>(); // key → receivedAt timestamp
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTtlMs: number = 3600 * 1000) {
    // Periodically evict expired entries
    this.cleanupInterval = setInterval(() => this.evict(), 60_000);
  }

  /**
   * Returns true if this mid was already seen (duplicate).
   * Registers it if not.
   */
  checkAndSet(event: string, mid: string, ttlMs?: number): boolean {
    const key = `${event}:${mid}`;
    if (this.store.has(key)) return true;
    this.store.set(key, Date.now() + (ttlMs ?? this.defaultTtlMs));
    return false;
  }

  has(event: string, mid: string): boolean {
    return this.store.has(`${event}:${mid}`);
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  private evict(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.store.entries()) {
      if (now > expiresAt) this.store.delete(key);
    }
  }
}
