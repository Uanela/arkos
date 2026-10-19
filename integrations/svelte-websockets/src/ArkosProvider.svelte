<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import type { SocketOptions } from "socket.io-client";
  import { setArkosClient, type ArkosManager } from "./context.svelte.js";

  interface Props {
    manager: ArkosManager;
    options?: Partial<SocketOptions>;
    children?: Snippet;
  }

  const { manager, options, children }: Props = $props();

  setArkosClient(
    () => manager,
    untrack(() => options)
  );
</script>

{@render children?.()}
