import { untrack } from "svelte";
import type { Readable, Subscriber, Unsubscriber } from "svelte/store";

/**
 * Exposes rune-backed state through the Svelte store contract so the same
 * object works with both `chat.status` (runes) and `$chat.status` (stores).
 *
 * `notify()` must be called after every state change; it pushes a fresh
 * snapshot to all store subscribers.
 *
 * @internal
 */
export class StoreBridge<T> implements Readable<T> {
  #subscribers = new Set<Subscriber<T>>();
  #snapshot: () => T;

  constructor(snapshot: () => T) {
    this.#snapshot = snapshot;
  }

  subscribe = (run: Subscriber<T>): Unsubscriber => {
    this.#subscribers.add(run);
    run(untrack(this.#snapshot));
    return () => {
      this.#subscribers.delete(run);
    };
  };

  notify(): void {
    if (this.#subscribers.size === 0) return;
    const value = untrack(this.#snapshot);
    // snapshot so a subscriber that unsubscribes mid-iteration is safe
    for (const run of [...this.#subscribers]) run(value);
  }
}
