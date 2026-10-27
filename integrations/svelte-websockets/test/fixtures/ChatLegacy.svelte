<script lang="ts">
  import { useGateway } from "../../src/index.js";

  export let index = 0;

  const chat = useGateway("/chat");
  let messages: string[] = [];
  chat.on<{ text: string }>("receive_message", (data) => (messages = [...messages, data.text]));
</script>

<p data-testid="status">{$chat.status}</p>
<p data-testid="index">{index}</p>
<ul data-testid="messages">
  {#each messages as message}<li>{message}</li>{/each}
</ul>
