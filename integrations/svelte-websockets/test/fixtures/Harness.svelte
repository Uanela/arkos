<script lang="ts">
  import type { Component } from "svelte";
  import type { Manager } from "socket.io-client";
  import { ArkosProvider } from "../../src/index.js";

  interface Props {
    manager: Manager;
    child: Component<any>;
    childProps?: Record<string, unknown>;
    count?: number;
  }

  const { manager, child: Child, childProps = {}, count = 1 }: Props = $props();
</script>

<ArkosProvider {manager}>
  {#each Array.from({ length: count }, (_, i) => i) as i (i)}
    <Child index={i} {...childProps} />
  {/each}
</ArkosProvider>
