import { useState, useCallback, useEffect } from "react";
import { useGateway } from "@arkosjs/react-websockets";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Screen = "join" | "waiting" | "game";

// ─── Component ────────────────────────────────────────────────────────────────

export function TicTacToe() {
  const game = useGateway("/tic-tac-toe");

  useEffect(() => {
    game.raw.rawSocket.connect();
  }, []);

  const status = game.status;

  // ── State ──
  const [screen, setScreen] = useState<Screen>("join");
  const [username, setUsername] = useState("");
  const [myMark, setMyMark] = useState<Mark | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<Mark>("X");
  const [gameActive, setGameActive] = useState(false);
  const [nameX, setNameX] = useState("—");
  const [nameO, setNameO] = useState("—");
  const [overlay, setOverlay] = useState<{
    emoji: string;
    title: string;
    sub: string;
    titleColor?: string;
  } | null>(null);
  const [poppedCell, setPoppedCell] = useState<number | null>(null);

  // ── Emitters ──
  const joinEmitter = game.useEmit<{ username: string }>("join_game", {
    ack: true,
    timeout: 6000,
  });
  const moveEmitter = game.useEmit<{ roomId: string; index: number }>(
    "make_move",
    { ack: true, timeout: 5000 }
  );

  // ── Helpers ──
  const handleGameStart = useCallback(
    (data: GameStartData) => {
      setMyMark(data.yourMark);
      setRoomId(data.roomId);
      setBoard([...data.board]);
      setCurrentTurn(data.currentTurn);
      setGameActive(true);
      if (data.yourMark === "X") {
        setNameX(username);
        setNameO(data.opponentUsername);
      } else {
        setNameX(data.opponentUsername);
        setNameO(username);
      }
      setScreen("game");
    },
    [username]
  );

  // ── Listeners ──
  game.on<GameStartData>("game_start", handleGameStart);

  game.on<MoveMadeData>("move_made", (data) => {
    setBoard([...data.board]);
    setCurrentTurn(data.currentTurn);
    setPoppedCell(data.index);
    setTimeout(() => setPoppedCell(null), 200);
  });

  game.on<GameOverData>("game_over", (data) => {
    setBoard([...data.board]);
    setGameActive(false);
    if (data.result === "draw") {
      setOverlay({ emoji: "🤝", title: "It's a Draw!", sub: "" });
    } else if (data.result === myMark) {
      setOverlay({
        emoji: "🏆",
        title: "You Win!",
        sub: `${data.winnerUsername} takes it`,
        titleColor: "var(--accent)",
      });
    } else {
      setOverlay({
        emoji: "😤",
        title: "You Lose",
        sub: `${data.winnerUsername} wins this round`,
        titleColor: "var(--o-color)",
      });
    }
  });

  game.on<OpponentLeftData>("opponent_left", (data) => {
    setGameActive(false);
    setOverlay({ emoji: "🚪", title: "Opponent Left", sub: data.message });
  });

  // ── Handlers ──
  async function handleJoin() {
    const name = username.trim();
    if (!name) return;

    const result = await joinEmitter.emit({ username: name }, { ack: true });
    if (!result?.success) return;

    if ((result.data as any)?.waiting) {
      setScreen("waiting");
      return;
    }

    handleGameStart(result.data as GameStartData);
  }

  async function handleCellClick(index: number) {
    if (
      !gameActive ||
      currentTurn !== myMark ||
      board[index] !== null ||
      !roomId
    )
      return;

    // Optimistic update
    const prev = [...board];
    setBoard((b) => {
      const next = [...b];
      next[index] = myMark;
      return next;
    });

    const result = await moveEmitter.emit({ roomId, index }, { ack: true });

    if (!result?.success) {
      // Rollback
      setBoard(prev);
    }
  }

  function handlePlayAgain() {
    setOverlay(null);
    setMyMark(null);
    setRoomId(null);
    setBoard(Array(9).fill(null));
    setCurrentTurn("X");
    setGameActive(false);
    setNameX("—");
    setNameO("—");
    setScreen("join");
  }

  function handleCancelWait() {
    game.raw.rawSocket.disconnect();
    game.raw.rawSocket.connect();
    setScreen("join");
  }

  const isMyTurn = currentTurn === myMark;

  // ── Render ──
  return (
    <div className="container">
      <div className="header">
        <h1>
          <span className="x">X</span> vs <span className="o">O</span>
        </h1>
        <p>
          <span
            className={`connection-dot ${status === "connected" ? "connected" : ""}`}
          />
          {status}
        </p>
      </div>

      {/* Join */}
      {screen === "join" && (
        <div className="screen">
          <div className="join-form">
            <input
              type="text"
              placeholder="your username"
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button
              className="btn"
              onClick={handleJoin}
              disabled={
                !username.trim() ||
                status !== "connected" ||
                joinEmitter.loading
              }
            >
              {joinEmitter.loading ? "Joining..." : "Find Opponent"}
            </button>
          </div>
          <p className="text-muted">Open in two tabs to play.</p>
        </div>
      )}

      {/* Waiting */}
      {screen === "waiting" && (
        <div className="screen">
          <div className="waiting-indicator">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
          <p className="text-muted">Waiting for an opponent...</p>
          <button className="btn secondary" onClick={handleCancelWait}>
            Cancel
          </button>
        </div>
      )}

      {/* Game */}
      {screen === "game" && (
        <div className="screen">
          <div className="scoreboard">
            <div
              className={`score-card x ${currentTurn === "X" ? "active-turn" : ""}`}
            >
              <div className="name">{nameX}</div>
              <div className="mark">X</div>
            </div>
            <div
              className={`score-card o ${currentTurn === "O" ? "active-turn" : ""}`}
            >
              <div className="name">{nameO}</div>
              <div className="mark">O</div>
            </div>
          </div>

          <div
            className={`status-bar ${isMyTurn ? "your-turn" : "opponent-turn"}`}
          >
            {isMyTurn ? "▶ Your turn" : "Opponent is thinking..."}
          </div>

          <div className="board">
            {board.map((cell, i) => (
              <div
                key={i}
                className={[
                  "cell",
                  cell ? `taken ${cell.toLowerCase()}` : "",
                  !cell && !isMyTurn ? "disabled" : "",
                  poppedCell === i ? "pop" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCellClick(i)}
              >
                {cell}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {overlay && (
        <div className="game-over-overlay visible">
          <div className="game-over-box">
            <div className="result-emoji">{overlay.emoji}</div>
            <div
              className="result-text"
              style={overlay.titleColor ? { color: overlay.titleColor } : {}}
            >
              {overlay.title}
            </div>
            {overlay.sub && <div className="result-sub">{overlay.sub}</div>}
            <button className="btn" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
