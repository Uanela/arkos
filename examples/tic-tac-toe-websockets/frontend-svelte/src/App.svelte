<script lang="ts">
  import { Manager } from "socket.io-client";
  import { ArkosProvider } from "@arkosjs/svelte-websockets";
  import TicTacToe from "./components/TicTacToe.svelte";

  const manager = new Manager("http://localhost:8000", {
    transports: ["websocket"],
    reconnection: true,
  });
</script>

<ArkosProvider {manager}>
  <TicTacToe />
</ArkosProvider>
