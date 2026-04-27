import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? false 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? false 
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
});

// Game state storage (in production, use Redis or database)
const gameRooms = new Map<string, GameState>();

interface GameState {
  roomId: string;
  players: Player[];
  currentTrick: PlayedCard[];
  trumpSuit: string | null;
  tricks: Trick[];
  teamTricks: { team1: number; team2: number };
  phase: 'bidding' | 'playing' | 'finished';
}

interface Player {
  id: string;
  name: string;
  position: 'south' | 'west' | 'north' | 'east';
  hand: Card[];
}

interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: string;
}

interface PlayedCard {
  player: string;
  card: Card;
}

interface Trick {
  cards: PlayedCard[];
  winner: string;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/api/games', (req, res) => {
  const games = Array.from(gameRooms.values()).map(game => ({
    roomId: game.roomId,
    playerCount: game.players.length,
    phase: game.phase,
  }));
  res.json(games);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a game room
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        roomId,
        players: [],
        currentTrick: [],
        trumpSuit: null,
        tricks: [],
        teamTricks: { team1: 0, team2: 0 },
        phase: 'bidding',
      });
    }
    
    const game = gameRooms.get(roomId)!;
    socket.emit('game-state', game);
  });

  // Leave a game room
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
  });

  // Player actions
  socket.on('play-card', ({ roomId, player, card }: { roomId: string; player: string; card: Card }) => {
    const game = gameRooms.get(roomId);
    if (!game) return;

    game.currentTrick.push({ player, card });
    
    // Broadcast update to all clients in room
    io.to(roomId).emit('game-state', game);
  });

  // Award trick to winner
  socket.on('award-trick', ({ roomId, winner }: { roomId: string; winner: string }) => {
    const game = gameRooms.get(roomId);
    if (!game) return;

    const isTeam1 = winner === 'south' || winner === 'north';
    
    game.teamTricks = {
      ...game.teamTricks,
      team1: isTeam1 ? game.teamTricks.team1 + 1 : game.teamTricks.team1,
      team2: !isTeam1 ? game.teamTricks.team2 + 1 : game.teamTricks.team2,
    };

    game.tricks.push({
      cards: [...game.currentTrick],
      winner,
    });

    game.currentTrick = [];
    
    io.to(roomId).emit('game-state', game);
  });

  // Set trump suit
  socket.on('set-trump', ({ roomId, trump }: { roomId: string; trump: string }) => {
    const game = gameRooms.get(roomId);
    if (!game) return;

    game.trumpSuit = trump;
    game.phase = 'playing';
    
    io.to(roomId).emit('game-state', game);
  });

  // Reset game
  socket.on('reset-game', (roomId: string) => {
    gameRooms.delete(roomId);
    io.to(roomId).emit('game-reset');
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Clean up empty rooms
    gameRooms.forEach((game, roomId) => {
      if (game.players.length === 0) {
        gameRooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Tarneeb Bot server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

export { app, io, httpServer };