<script lang="ts">
  import { useGateway } from "../../src/index.js";

  const chat = useGateway("/chat");
  const join = chat.useEmit<{ text: string }>("send_message", { ack: true });

  // Emitting from an effect must not subscribe the effect to the emitter's
  // own loading state, otherwise the ack would re-trigger the emit.
  $effect(() => {
    if (chat.status === "connected") join.emit({ text: "joined-from-effect" });
  });
</script>

<p data-testid="loading">{join.loading ? "Sending..." : "idle"}</p>
<p data-testid="last">{join.lastEmittedAt ? "emitted" : "never"}</p>
