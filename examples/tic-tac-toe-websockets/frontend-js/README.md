# frontend-js

Vanilla HTML/CSS/JS frontend for the Tic Tac Toe WebSocket example.

No bundler, no framework — just a single HTML file using `@arkosjs/websockets-client` via [esm.sh](https://esm.sh) and `socket.io-client` via CDN.

## Running

Serve `src/index.html` with any static file server. [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (VS Code) works fine.

```bash
# or with npx
npx serve src
```

Then open `http://localhost:3000` (or whatever port your server uses) in **two tabs** to play.

## Configuration

At the top of `src/index.html`, update the server URL to match your backend:

```js
const manager = new Manager("http://localhost:8000", {
    transports: ["websocket"],
    reconnection: true,
});
```

## What it uses

- [`@arkosjs/websockets-client`](https://www.npmjs.com/package/@arkosjs/websockets-client) — core WebSocket client via esm.sh
- [`socket.io-client`](https://www.npmjs.com/package/socket.io-client) — via CDN
