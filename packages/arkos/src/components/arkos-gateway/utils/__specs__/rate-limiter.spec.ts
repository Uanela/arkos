import { checkRateLimit, clearRateLimitForSocket } from "../rate-limiter";
import { ArkosGatewayStore } from "../../types";

// Mock store implementation
class MockStore {
  private data: Map<string, { count: number; resetAt: number }> = new Map();

  async increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.data.get(key);

    if (!existing || existing.resetAt <= now) {
      // New or expired window
      const resetAt = now + windowMs;
      this.data.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    // Existing valid window
    const newCount = existing.count + 1;
    this.data.set(key, { count: newCount, resetAt: existing.resetAt });
    return { count: newCount, resetAt: existing.resetAt };
  }

  async clear(pattern: string): Promise<void> {
    // Clear all keys that start with the pattern
    for (const key of this.data.keys()) {
      if (key.startsWith(pattern)) {
        this.data.delete(key);
      }
    }
  }

  // Helper method for testing to get internal state
  get(key: string): { count: number; resetAt: number } | undefined {
    return this.data.get(key);
  }
}

describe("checkRateLimit", () => {
  let store: ArkosGatewayStore;

  beforeEach(async () => {
    store = new MockStore() as any;
    // Clear between tests
    await clearRateLimitForSocket("socket-1", store);
    await clearRateLimitForSocket("socket-2", store);
  });

  test("allows first request", async () => {
    const result = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
        max: 10,
      },
      store
    );
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  test("allows requests up to max", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(
        "socket-1",
        "send_message",
        {
          windowMs: 60_000,
          max: 5,
        },
        store
      );
      expect(result.allowed).toBe(true);
    }
  });

  test("blocks when max is exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 60_000, max: 5 },
        store
      );
    }
    const result = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test("tracks different events independently", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 60_000, max: 5 },
        store
      );
    }
    const result = await checkRateLimit(
      "socket-1",
      "typing",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    expect(result.allowed).toBe(true);
  });

  test("tracks different sockets independently", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 60_000, max: 5 },
        store
      );
    }
    const blocked = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    const allowed = await checkRateLimit(
      "socket-2",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  test("resets after window expires", async () => {
    for (let i = 0; i < 2; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 50, max: 2 },
        store
      );
    }
    const blocked = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 50,
        max: 2,
      },
      store
    );
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    const result = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 50,
        max: 2,
      },
      store
    );
    expect(result.allowed).toBe(true);
  });

  test("defaults to max 100 when not provided", async () => {
    for (let i = 0; i < 100; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 60_000 },
        store
      );
    }
    const result = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
      },
      store
    );
    expect(result.allowed).toBe(false);
  });

  test("defaults to windowMs 60000 when not provided", async () => {
    const result = await checkRateLimit(
      "socket-1",
      "send_message",
      { max: 10 },
      store
    );
    expect(result.allowed).toBe(true);
  });
});

describe("clearRateLimitForSocket", () => {
  let store: ArkosGatewayStore;

  beforeEach(() => {
    store = new MockStore() as any;
  });

  test("clears all rate limit entries for a socket", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 60_000, max: 5 },
        store
      );
    }
    const blocked = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    expect(blocked.allowed).toBe(false);

    await clearRateLimitForSocket("socket-1", store);

    const result = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    expect(result.allowed).toBe(true);
  });

  test("clearing one socket does not affect another", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(
        "socket-1",
        "send_message",
        { windowMs: 60_000, max: 5 },
        store
      );
      await checkRateLimit(
        "socket-2",
        "send_message",
        { windowMs: 60_000, max: 5 },
        store
      );
    }

    await clearRateLimitForSocket("socket-1", store);

    const s1 = await checkRateLimit(
      "socket-1",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );
    const s2 = await checkRateLimit(
      "socket-2",
      "send_message",
      {
        windowMs: 60_000,
        max: 5,
      },
      store
    );

    expect(s1.allowed).toBe(true);
    expect(s2.allowed).toBe(false);
  });

  test("clearing a non-existent socket does not throw", async () => {
    await expect(
      clearRateLimitForSocket("ghost-socket", store)
    ).resolves.not.toThrow();
  });
});
