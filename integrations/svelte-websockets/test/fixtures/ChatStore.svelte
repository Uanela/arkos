<script lang="ts">
  import { useGateway } from "../../src/index.js";

  // Exactly the store-flavoured API from the issue's contract
  const chat = useGateway("/chat");
  const sendMessage = chat.useEmit<{ text: string; delay?: number }>("send_message");
</script>

<div>
  <p data-testid="status">Status: {$chat.status}</p>
  <p data-testid="user">User: {$chat.user?.name ?? "anonymous"}</p>
  <p data-testid="loading">{#if $sendMessage.loading}Sending...{:else}idle{/if}</p>
  <button onclick={() => sendMessage.emit({ text: "hello", delay: 100 }, { ack: true })}>
    send
  </button>
</div>
