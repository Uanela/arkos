# Tic Tac Toe — WebSockets Example

A real-time multiplayer Tic Tac Toe game built with [Arkos.js](https://arkosjs.com), demonstrating end-to-end WebSocket usage with `ArkosGateway` on the backend and `@arkosjs/websockets-client` / `@arkosjs/react-websockets` on the frontend.

## Structure

```
tic-tac-toe-websockets/
├── backend/               # Arkos.js server + ArkosGateway
├── frontend-js/           # Vanilla HTML/CSS/JS (no bundler)
└── frontend-react/        # React + Vite using @arkosjs/react-websockets
```

## How it works

Two players connect to the `/tic-tac-toe` namespace. The server handles matchmaking, turn validation, win detection, and disconnect cleanup — the clients only emit moves and react to events.

**Gateway events:**

| Event           | Direction       | Description                          |
| --------------- | --------------- | ------------------------------------ |
| `join_game`     | client → server | Join the matchmaking queue           |
| `game_start`    | server → client | Game found, sends initial state      |
| `make_move`     | client → server | Play a cell (index 0–8)              |
| `move_made`     | server → client | Broadcast updated board after a move |
| `game_over`     | server → client | Win or draw result                   |
| `opponent_left` | server → client | Opponent disconnected mid-game       |

## Getting started

### 1. Start the backend

```bash
cd backend
pnpm install
pnpm dev
```

The server runs on `http://localhost:8000` by default.

### 2. Run a frontend

**Vanilla JS** — open `frontend-js/src/index.html` with Live Server or any static file server.

**React**:

```bash
cd frontend-react
pnpm install
pnpm dev
```

Open the app in **two browser tabs** to play against yourself, or share the URL with someone on the same network.

## Key packages

- [`arkos`](https://www.npmjs.com/package/arkos) — backend framework
- [`@arkosjs/websockets-client`](https://www.npmjs.com/package/@arkosjs/websockets-client) — framework-agnostic WebSocket client
- [`@arkosjs/react-websockets`](https://www.npmjs.com/package/@arkosjs/react-websockets) — React hooks for Arkos WebSockets

## Related

- [ArkosGateway Documentation](https://www.arkosjs.com/docs/core-concepts/components/gateways)
- [Arkos.js GitHub](https://github.com/uanela/arkos)
