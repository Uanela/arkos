import { untrack } from "svelte";
import type { Readable, Subscriber, Unsubscriber } from "svelte/store";

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
    for (const run of [...this.#subscribers]) run(value);
  }
}
