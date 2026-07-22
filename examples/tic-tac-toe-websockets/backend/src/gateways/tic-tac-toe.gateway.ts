import { ArkosGateway } from "arkos/websockets";

type Mark = "X" | "O";
type Cell = Mark | null;
type Board = Cell[];

interface Player {
  socketId: string;
  username: string;
  mark: Mark;
}

interface GameRoom {
  roomId: string;
  players: [Player, Player];
  board: Board;
  currentTurn: Mark;
  status: "playing" | "finished";
}

// Rooms currently being played
const rooms = new Map<string, GameRoom>();

// Single waiting player slot — first to join waits here for an opponent
let waitingPlayer: { socketId: string; username: string } | null = null;

function emptyBoard(): Board {
  return Array(9).fill(null);
}

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

function checkWinner(board: Board): Mark | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Mark;
    }
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

function findRoomBySocket(socketId: string): GameRoom | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) return room;
  }
}

function opponent(room: GameRoom, socketId: string): Player {
  return room.players.find((p) => p.socketId !== socketId)!;
}

const tictactoeGateway = ArkosGateway({
  name: "/tic-tac-toe",
  authentication: false,
  dedup: false, // no dedup needed for a game — every move is intentional
});

/**
 * join_game
 *
 * Payload: { username: string }
 *
 * First player to join goes into the waiting slot and receives:
 *   waiting { message }
 *
 * Second player triggers game start. Both players receive:
 *   game_start { roomId, board, yourMark, opponentUsername, currentTurn }
 */
tictactoeGateway.on({ event: "join_game", ack: true }, (socket, data, ack) => {
  const username: string = data?.username?.trim() || "Anonymous";

  // Already waiting — pair them up
  if (waitingPlayer && waitingPlayer.socketId !== socket.id) {
    const roomId = `room_${Date.now()}`;

    const playerX: Player = {
      socketId: waitingPlayer.socketId,
      username: waitingPlayer.username,
      mark: "X",
    };
    const playerO: Player = {
      socketId: socket.id,
      username,
      mark: "O",
    };

    const room: GameRoom = {
      roomId,
      players: [playerX, playerO],
      board: emptyBoard(),
      currentTurn: "X",
      status: "playing",
    };

    rooms.set(roomId, room);
    waitingPlayer = null;

    // Put both sockets in the same socket.io room
    socket.join(roomId);
    tictactoeGateway.socket(playerX.socketId).join(roomId);

    const basePayload = {
      roomId,
      board: room.board,
      currentTurn: room.currentTurn,
    };

    // Notify waiting player (X)
    tictactoeGateway.socket(playerX.socketId).emit("game_start", {
      ...basePayload,
      yourMark: "X",
      opponentUsername: username,
    });

    // Ack joining player (O)
    ack?.({
      success: true,
      data: {
        ...basePayload,
        yourMark: "O",
        opponentUsername: playerX.username,
      },
    });

    return;
  }

  // No one waiting — put this player in the slot
  waitingPlayer = { socketId: socket.id, username };
  ack?.({ success: true, data: { waiting: true } });
});

/**
 * make_move
 *
 * Payload: { roomId: string, index: number }
 *
 * Validates the move server-side (correct turn, empty cell, valid index).
 * Broadcasts to both players:
 *   move_made { board, index, mark, currentTurn }
 *
 * If the game ends:
 *   game_over { board, result: "X" | "O" | "draw", winnerUsername? }
 */
tictactoeGateway.on({ event: "make_move", ack: true }, (socket, data, ack) => {
  const { roomId, index } = data ?? {};

  const room = rooms.get(roomId);
  if (!room) {
    return ack?.({ success: false, error: "Room not found." });
  }

  if (room.status === "finished") {
    return ack?.({ success: false, error: "Game is already over." });
  }

  const player = room.players.find((p) => p.socketId === socket.id);
  if (!player) {
    return ack?.({ success: false, error: "You are not in this room." });
  }

  if (player.mark !== room.currentTurn) {
    return ack?.({ success: false, error: "It's not your turn." });
  }

  if (typeof index !== "number" || index < 0 || index > 8) {
    return ack?.({ success: false, error: "Invalid cell index." });
  }

  if (room.board[index] !== null) {
    return ack?.({ success: false, error: "Cell already taken." });
  }

  // Apply move
  room.board[index] = player.mark;
  room.currentTurn = player.mark === "X" ? "O" : "X";

  const moveMadePayload = {
    board: room.board,
    index,
    mark: player.mark,
    currentTurn: room.currentTurn,
  };

  tictactoeGateway.room(roomId).emit("move_made", moveMadePayload);
  ack?.({ success: true });

  // Check win / draw
  const result = checkWinner(room.board);
  if (result) {
    room.status = "finished";

    const winnerPlayer =
      result !== "draw"
        ? room.players.find((p) => p.mark === result)
        : undefined;

    tictactoeGateway.room(roomId).emit("game_over", {
      board: room.board,
      result,
      winnerUsername: winnerPlayer?.username ?? null,
    });

    rooms.delete(roomId);
  }
});

/**
 * disconnect hook
 *
 * If a player disconnects mid-game, notify the opponent and clean up.
 * If the waiting player disconnects, clear the slot.
 */
tictactoeGateway.hook("disconnect", (socket) => {
  // Clear waiting slot if it was this socket
  if (waitingPlayer?.socketId === socket.id) {
    waitingPlayer = null;
    return;
  }

  // Notify opponent and clean up the room
  const room = findRoomBySocket(socket.id);
  if (!room || room.status === "finished") return;

  room.status = "finished";

  const opp = opponent(room, socket.id);
  tictactoeGateway.socket(opp.socketId).emit("opponent_left", {
    message: "Your opponent disconnected. You win by default!",
  });

  rooms.delete(room.roomId);
});

export default tictactoeGateway;
