import { Manager } from "socket.io-client";
import { WebSocketProvider } from "@arkosjs/react-websockets";
import { TicTacToe } from "./components/tic-tac-toe";
import { useMemo } from "react";

function App() {
  const manager = useMemo(() => {
    return new Manager("http://localhost:8000", {
      transports: ["websocket"],
      reconnection: true,
    });
  }, []);

  return (
    <WebSocketProvider manager={manager}>
      <TicTacToe />
    </WebSocketProvider>
  );
}

export default App;
