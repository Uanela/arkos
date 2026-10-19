<script lang="ts">
  import { useGateway } from "../../src/index.js";

  const chat = useGateway("/chat");
  const sendMessage = chat.useEmit<{ text: string; delay?: number }>("send_message");
</script>

<div>
  <p data-testid="status">Status: {$chat.status}</p>
  <p data-testid="loading">{#if $sendMessage.loading}Sending...{:else}idle{/if}</p>
  <button onclick={() => sendMessage.emit({ text: "hello", delay: 100 }, { ack: true })}>
    send
  </button>
</div>
