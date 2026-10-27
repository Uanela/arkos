<script lang="ts">
  import { useGateway } from "../../src/index.js";

  const chat = useGateway("/chat");
  const join = chat.useEmit<{ text: string }>("send_message", { ack: true });

  $effect(() => {
    if (chat.status === "connected") join.emit({ text: "joined-from-effect" });
  });
</script>

<p data-testid="loading">{join.loading ? "Sending..." : "idle"}</p>
<p data-testid="last">{join.lastEmittedAt ? "emitted" : "never"}</p>
