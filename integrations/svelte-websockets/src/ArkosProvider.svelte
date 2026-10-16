<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import type { SocketOptions } from "socket.io-client";
  import { initArkosClient, type ArkosManager } from "./context.svelte.js";

  interface Props {
    /** socket.io `Manager` that owns the connection config (url, auth, reconnection…). */
    manager: ArkosManager;
    /** Default socket options applied to every namespace. Read once. */
    options?: Partial<SocketOptions>;
    children?: Snippet;
  }

  const { manager, options, children }: Props = $props();

  // Getter so a new manager swaps the client without remounting children
  initArkosClient(
    () => manager,
    untrack(() => options)
  );
</script>

{@render children?.()}
