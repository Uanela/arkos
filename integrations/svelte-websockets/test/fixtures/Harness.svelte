<script lang="ts">
  import type { Component } from "svelte";
  import { ArkosProvider, type ArkosManager } from "../../src/index.js";

  interface Props {
    manager: ArkosManager;
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
