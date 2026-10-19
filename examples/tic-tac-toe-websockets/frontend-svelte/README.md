# Tic Tac Toe: Svelte 5 frontend

Svelte 5 + Vite client for the [tic-tac-toe backend](../backend), built on [`@arkosjs/svelte-websockets`](../../../integrations/svelte-websockets).

It shows the full connect → emit → receive loop:

- **connect:** `<ArkosProvider {manager}>` in [`App.svelte`](src/App.svelte), with reactive `game.status` in the header
- **emit:** `join_game` / `make_move` through `game.useEmit(...)`, waiting for acks with `loading` / `error` state
- **receive:** `game_start`, `move_made`, `game_over` and `opponent_left` through `game.on(...)`

## Run

`@arkosjs/svelte-websockets` is linked from `integrations/`, so build it first:

```bash
cd ../../../integrations/svelte-websockets && pnpm install && pnpm build
```

Then start the [backend](../backend) and run:

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 in two tabs to play against yourself.
