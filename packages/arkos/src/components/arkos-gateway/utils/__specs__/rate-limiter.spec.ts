import { checkRateLimit, clearRateLimitForSocket } from "../rate-limiter";

describe("checkRateLimit", () => {
  beforeEach(() => {
    // clear internal store between tests by disconnecting all known sockets
    clearRateLimitForSocket("socket-1");
    clearRateLimitForSocket("socket-2");
  });

  test("allows first request", () => {
    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 10,
    });
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  test("allows requests up to max", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("socket-1", "send_message", {
        windowMs: 60_000,
        max: 5,
      });
      expect(result.allowed).toBe(true);
    }
  });

  test("blocks when max is exceeded", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 60_000, max: 5 });
    }
    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 5,
    });
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test("tracks different events independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 60_000, max: 5 });
    }
    const result = checkRateLimit("socket-1", "typing", {
      windowMs: 60_000,
      max: 5,
    });
    expect(result.allowed).toBe(true);
  });

  test("tracks different sockets independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 60_000, max: 5 });
    }
    const blocked = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 5,
    });
    const allowed = checkRateLimit("socket-2", "send_message", {
      windowMs: 60_000,
      max: 5,
    });
    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  test("resets after window expires", async () => {
    for (let i = 0; i < 2; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 50, max: 2 });
    }
    const blocked = checkRateLimit("socket-1", "send_message", {
      windowMs: 50,
      max: 2,
    });
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 50,
      max: 2,
    });
    expect(result.allowed).toBe(true);
  });

  test("defaults to max 100 when not provided", () => {
    for (let i = 0; i < 100; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 60_000 });
    }
    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
    });
    expect(result.allowed).toBe(false);
  });

  test("defaults to windowMs 60000 when not provided", () => {
    const result = checkRateLimit("socket-1", "send_message", { max: 10 });
    expect(result.allowed).toBe(true);
  });
});

describe("clearRateLimitForSocket", () => {
  test("clears all rate limit entries for a socket", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 60_000, max: 5 });
    }
    const blocked = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 5,
    });
    expect(blocked.allowed).toBe(false);

    clearRateLimitForSocket("socket-1");

    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 5,
    });
    expect(result.allowed).toBe(true);
  });

  test("clearing one socket does not affect another", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("socket-1", "send_message", { windowMs: 60_000, max: 5 });
      checkRateLimit("socket-2", "send_message", { windowMs: 60_000, max: 5 });
    }

    clearRateLimitForSocket("socket-1");

    const s1 = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 5,
    });
    const s2 = checkRateLimit("socket-2", "send_message", {
      windowMs: 60_000,
      max: 5,
    });

    expect(s1.allowed).toBe(true);
    expect(s2.allowed).toBe(false);
  });

  test("clearing a non-existent socket does not throw", () => {
    expect(() => clearRateLimitForSocket("ghost-socket")).not.toThrow();
  });
});
