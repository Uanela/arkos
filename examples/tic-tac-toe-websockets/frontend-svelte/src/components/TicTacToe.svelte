<script lang="ts">
  import { useGateway } from "@arkosjs/svelte-websockets";

  // ─── Types ──────────────────────────────────────────────────────────────────

  type Mark = "X" | "O";
  type Cell = Mark | null;

  interface GameStartData {
    roomId: string;
    board: Cell[];
    yourMark: Mark;
    opponentUsername: string;
    currentTurn: Mark;
  }

  interface MoveMadeData {
    board: Cell[];
    index: number;
    mark: Mark;
    currentTurn: Mark;
  }

  interface GameOverData {
    board: Cell[];
    result: Mark | "draw";
    winnerUsername: string | null;
  }

  interface OpponentLeftData {
    message: string;
  }

  interface Overlay {
    emoji: string;
    title: string;
    sub: string;
    titleColor?: string;
  }

  type Screen = "join" | "waiting" | "game";

  // ─── Gateway ────────────────────────────────────────────────────────────────

  const game = useGateway("/tic-tac-toe");

  // ── State ──
  let screen = $state<Screen>("join");
  let username = $state("");
  let myMark = $state<Mark | null>(null);
  let roomId = $state<string | null>(null);
  let board = $state<Cell[]>(Array(9).fill(null));
  let currentTurn = $state<Mark>("X");
  let gameActive = $state(false);
  let nameX = $state("—");
  let nameO = $state("—");
  let overlay = $state<Overlay | null>(null);
  let poppedCell = $state<number | null>(null);

  const isMyTurn = $derived(currentTurn === myMark);

  // ── Emitters ──
  const joinEmitter = game.useEmit<
    { username: string },
    GameStartData | { waiting: true }
  >("join_game", { ack: true, timeout: 6000 });

  const moveEmitter = game.useEmit<{ roomId: string; index: number }>(
    "make_move",
    { ack: true, timeout: 5000 }
  );

  // ── Helpers ──
  function handleGameStart(data: GameStartData) {
    myMark = data.yourMark;
    roomId = data.roomId;
    board = [...data.board];
    currentTurn = data.currentTurn;
    gameActive = true;
    if (data.yourMark === "X") {
      nameX = username;
      nameO = data.opponentUsername;
    } else {
      nameX = data.opponentUsername;
      nameO = username;
    }
    screen = "game";
  }

  // ── Listeners ──
  game.on<GameStartData>("game_start", handleGameStart);

  game.on<MoveMadeData>("move_made", (data) => {
    board = [...data.board];
    currentTurn = data.currentTurn;
    poppedCell = data.index;
    setTimeout(() => (poppedCell = null), 200);
  });

  game.on<GameOverData>("game_over", (data) => {
    board = [...data.board];
    gameActive = false;
    if (data.result === "draw") {
      overlay = { emoji: "🤝", title: "It's a Draw!", sub: "" };
    } else if (data.result === myMark) {
      overlay = {
        emoji: "🏆",
        title: "You Win!",
        sub: `${data.winnerUsername} takes it`,
        titleColor: "var(--accent)",
      };
    } else {
      overlay = {
        emoji: "😤",
        title: "You Lose",
        sub: `${data.winnerUsername} wins this round`,
        titleColor: "var(--o-color)",
      };
    }
  });

  game.on<OpponentLeftData>("opponent_left", (data) => {
    gameActive = false;
    overlay = { emoji: "🚪", title: "Opponent Left", sub: data.message };
  });

  // ── Handlers ──
  async function handleJoin() {
    const name = username.trim();
    if (!name) return;

    const result = await joinEmitter.emit({ username: name }, { ack: true });
    if (!result.success || !result.data) return;

    if ("waiting" in result.data) {
      screen = "waiting";
      return;
    }

    handleGameStart(result.data);
  }

  async function handleCellClick(index: number) {
    if (!gameActive || !isMyTurn || board[index] !== null || !roomId) return;

    // Optimistic update
    const prev = [...board];
    board[index] = myMark;

    const result = await moveEmitter.emit({ roomId, index }, { ack: true });

    if (!result.success) board = prev; // Rollback
  }

  function handlePlayAgain() {
    overlay = null;
    myMark = null;
    roomId = null;
    board = Array(9).fill(null);
    currentTurn = "X";
    gameActive = false;
    nameX = "—";
    nameO = "—";
    screen = "join";
  }

  function handleCancelWait() {
    game.raw.rawSocket.disconnect();
    game.raw.rawSocket.connect();
    screen = "join";
  }
</script>

<div class="container">
  <div class="header">
    <h1><span class="x">X</span> vs <span class="o">O</span></h1>
    <p>
      <span class="connection-dot" class:connected={game.status === "connected"}></span>
      {game.status}
    </p>
  </div>

  {#if screen === "join"}
    <div class="screen">
      <div class="join-form">
        <input
          type="text"
          placeholder="your username"
          maxlength={20}
          bind:value={username}
          onkeydown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button
          class="btn"
          onclick={handleJoin}
          disabled={!username.trim() || game.status !== "connected" || joinEmitter.loading}
        >
          {joinEmitter.loading ? "Joining..." : "Find Opponent"}
        </button>
      </div>
      {#if joinEmitter.error}
        <p class="text-muted">{joinEmitter.error}</p>
      {/if}
      <p class="text-muted">Open in two tabs to play.</p>
    </div>
  {:else if screen === "waiting"}
    <div class="screen">
      <div class="waiting-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <p class="text-muted">Waiting for an opponent...</p>
      <button class="btn secondary" onclick={handleCancelWait}>Cancel</button>
    </div>
  {:else}
    <div class="screen">
      <div class="scoreboard">
        <div class="score-card x" class:active-turn={currentTurn === "X"}>
          <div class="name">{nameX}</div>
          <div class="mark">X</div>
        </div>
        <div class="score-card o" class:active-turn={currentTurn === "O"}>
          <div class="name">{nameO}</div>
          <div class="mark">O</div>
        </div>
      </div>

      <div class="status-bar {isMyTurn ? 'your-turn' : 'opponent-turn'}">
        {isMyTurn ? "▶ Your turn" : "Opponent is thinking..."}
      </div>

      <div class="board">
        {#each board as cell, i (i)}
          <button
            type="button"
            class="cell {cell ? `taken ${cell.toLowerCase()}` : ''}"
            class:disabled={!cell && !isMyTurn}
            class:pop={poppedCell === i}
            onclick={() => handleCellClick(i)}
          >
            {cell ?? ""}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if overlay}
    <div class="game-over-overlay visible">
      <div class="game-over-box">
        <div class="result-emoji">{overlay.emoji}</div>
        <div class="result-text" style:color={overlay.titleColor}>
          {overlay.title}
        </div>
        {#if overlay.sub}
          <div class="result-sub">{overlay.sub}</div>
        {/if}
        <button class="btn" onclick={handlePlayAgain}>Play Again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .cell {
    font-family: inherit;
    padding: 0;
  }
</style>
