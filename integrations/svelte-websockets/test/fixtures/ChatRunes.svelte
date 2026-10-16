<script lang="ts">
  import { onMount } from "svelte";
  import { useGateway, type Gateway, type SocketEmitter } from "../../src/index.js";
  import type { SendPayload } from "../server.js";

  interface Props {
    index?: number;
    namespace?: string;
    onReady?: (api: { chat: Gateway; send: SocketEmitter<SendPayload> }) => void;
    onMessage?: (data: { text: string }) => void;
  }

  const { index = 0, namespace = "/chat", onReady, onMessage }: Props = $props();

  const chat = useGateway<{ name: string }>(() => namespace);
  const send = chat.useEmit<SendPayload>("send_message", { ack: true });

  let messages = $state<string[]>([]);
  chat.on<{ text: string }>("receive_message", (data) => {
    messages.push(data.text);
    onMessage?.(data);
  });

  const label = $derived(`${chat.namespace}:${chat.status}`);

  onMount(() => onReady?.({ chat, send }));
</script>

<section data-testid="chat-{index}">
  <p data-testid="status">{chat.status}</p>
  <p data-testid="label">{label}</p>
  <p data-testid="user">{chat.user?.name ?? "anonymous"}</p>
  <p data-testid="loading">{send.loading ? "Sending..." : "idle"}</p>
  <p data-testid="error">{send.error ?? ""}</p>
  <ul data-testid="messages">
    {#each messages as message}<li>{message}</li>{/each}
  </ul>
</section>
