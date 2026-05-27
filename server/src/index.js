import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import {
  createRoom, startGame, nextQuestion, submitAnswer,
  getLeaderboard, getPodium, endGame, addPlayer,
  removePlayer, getRoom, getAllAnswersCount, getPlayerCount,
  AVATARS, CATEGORIES, TIME_LIMITS,
} from './gameManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

app.get('/api/categories', (req, res) => {
  const list = Object.entries(CATEGORIES).map(([key, val]) => ({
    id: key, name: val.name, apiId: val.id,
  }));
  res.json(list);
});

app.get('/api/avatars', (req, res) => res.json(AVATARS));

const CLIENT_BUILD = path.join(__dirname, '../../client/dist');
app.use(express.static(CLIENT_BUILD));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
  }
});

// Timer management
const roomTimers = new Map();

function clearRoomTimer(pin) {
  if (roomTimers.has(pin)) {
    clearTimeout(roomTimers.get(pin));
    clearTimeout(roomTimers.get(`${pin}:leaderboard`));
    roomTimers.delete(pin);
    roomTimers.delete(`${pin}:leaderboard`);
  }
}

function sendGameEnd(pin) {
  clearRoomTimer(pin);
  const podium = getPodium(pin);
  endGame(pin);
  io.to(`room:${pin}`).emit('game:end', { podium });
}

function advanceToNextQuestion(pin) {
  const question = nextQuestion(pin);
  if (!question) {
    sendGameEnd(pin);
    return false;
  }
  io.to(`room:${pin}`).emit('question:new', question);
  startQuestionTimer(pin);
  return true;
}

function revealAndHandleEnd(pin) {
  const room = getRoom(pin);
  if (!room) return;
  const question = room.questions[room.currentQuestionIndex];
  if (!question) return;

  const correctIdx = question.options.findIndex(o => o.correct);
  io.to(`room:${pin}`).emit('question:reveal', { correctOptionIndex: correctIdx });

  if (room.advanceMode === 'auto') {
    const leaderboardDelay = setTimeout(() => {
      const leaderboard = getLeaderboard(pin);
      io.to(`room:${pin}`).emit('leaderboard:update', { leaderboard, showing: true });
      roomTimers.delete(`${pin}:leaderboard`);

      const nextDelay = setTimeout(() => {
        advanceToNextQuestion(pin);
      }, 4000);
      roomTimers.set(`${pin}:leaderboard`, nextDelay);
    }, 2000);
    roomTimers.set(`${pin}:leaderboard`, leaderboardDelay);
  }
}

function startQuestionTimer(pin) {
  clearRoomTimer(pin);
  const room = getRoom(pin);
  if (!room) return;

  const timeLimit = (TIME_LIMITS[room.difficulty] || 20) * 1000;

  const timer = setTimeout(() => {
    revealAndHandleEnd(pin);
  }, timeLimit);
  roomTimers.set(pin, timer);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('host:create-room', async (data, callback) => {
    try {
      const { pin, roomId } = createRoom({
        hostId: socket.id,
        topic: data.topic,
        difficulty: data.difficulty,
        questionCount: data.questionCount,
        advanceMode: data.advanceMode || 'manual',
      });
      socket.join(`room:${pin}`);
      socket.data.pin = pin;
      socket.data.role = 'host';

      const origin = socket.handshake.headers.origin || `http://localhost:${PORT}`;
      const joinUrl = `${origin}/join?pin=${pin}`;
      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 300, margin: 2 });
      } catch (e) {
        console.log('QR generation failed:', e.message);
      }

      callback({ ok: true, pin, roomId, qrDataUrl, joinUrl });
    } catch (err) {
      callback({ ok: false, error: err.message });
    }
  });

  socket.on('player:join', (data, callback) => {
    try {
      const player = addPlayer(data.pin, {
        nickname: data.nickname,
        avatar: data.avatar,
      });
      socket.join(`room:${data.pin}`);
      socket.data.pin = data.pin;
      socket.data.role = 'player';
      socket.data.playerId = player.id;

      const room = getRoom(data.pin);
      io.to(`room:${data.pin}`).emit('player:joined', {
        players: room.players,
        count: room.players.length,
      });

      callback({ ok: true, player });
    } catch (err) {
      callback({ ok: false, error: err.message });
    }
  });

  socket.on('host:start-game', async (data, callback) => {
    try {
      const pin = data.pin || socket.data.pin;
      const totalQuestions = await startGame(pin);
      const question = nextQuestion(pin);

      // Incluir la pregunta en game:started para que el host la reciba via navigation state
      io.to(`room:${pin}`).emit('game:started', { totalQuestions, question });
      // question:new para los jugadores que ya estan escuchando
      io.to(`room:${pin}`).emit('question:new', question);

      startQuestionTimer(pin);

      if (typeof callback === 'function') callback({ ok: true, totalQuestions, question });
    } catch (err) {
      console.error('Error starting game:', err);
      if (typeof callback === 'function') callback({ ok: false, error: err.message });
    }
  });

  socket.on('host:reveal-answers', (data) => {
    const pin = data.pin || socket.data.pin;
    const room = getRoom(pin);
    if (!room) return;

    const question = room.questions[room.currentQuestionIndex];
    if (!question) return;

    const correctIdx = question.options.findIndex(o => o.correct);
    io.to(`room:${pin}`).emit('question:reveal', { correctOptionIndex: correctIdx });
    clearRoomTimer(pin);

    if (room.advanceMode === 'auto') {
      setTimeout(() => {
        const leaderboard = getLeaderboard(pin);
        io.to(`room:${pin}`).emit('leaderboard:update', { leaderboard, showing: true });
        setTimeout(() => advanceToNextQuestion(pin), 4000);
      }, 2000);
    }
  });

  socket.on('host:next-question', (data, callback) => {
    try {
      const pin = data.pin || socket.data.pin;
      const room = getRoom(pin);
      if (!room) throw new Error('Room not found');

      clearRoomTimer(pin);

      const leaderboard = getLeaderboard(pin);
      io.to(`room:${pin}`).emit('leaderboard:update', { leaderboard, showing: true });

      if (room.advanceMode === 'auto') {
        setTimeout(() => {
          const ok = advanceToNextQuestion(pin);
          if (callback) callback({ ok, finished: !ok });
        }, 5000);
      } else {
        if (callback) callback({ ok: true, finished: false, leaderboard });
      }
    } catch (err) {
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  socket.on('host:continue-after-leaderboard', (data) => {
    const pin = data.pin || socket.data.pin;
    advanceToNextQuestion(pin);
  });

  socket.on('player:answer', (data, callback) => {
    try {
      const pin = data.pin || socket.data.pin;
      const playerId = data.playerId || socket.data.playerId;
      const result = submitAnswer(pin, playerId, data.optionIndex);

      if (!result) {
        if (callback) callback({ ok: false, error: 'Already answered or invalid' });
        return;
      }

      const answeredCount = getAllAnswersCount(pin);
      const totalPlayers = getPlayerCount(pin);

      io.to(`room:${pin}`).emit('answer:count', { answered: answeredCount, total: totalPlayers });

      if (answeredCount >= totalPlayers) {
        const room = getRoom(pin);
        if (room && room.advanceMode === 'auto') {
          clearRoomTimer(pin);
          revealAndHandleEnd(pin);
        }
      }

      if (callback) callback({ ok: true, result });
    } catch (err) {
      if (callback) callback({ ok: false, error: err.message });
    }
  });

  socket.on('host:show-leaderboard', (data) => {
    const pin = data.pin || socket.data.pin;
    const leaderboard = getLeaderboard(pin);
    io.to(`room:${pin}`).emit('leaderboard:update', { leaderboard, showing: true });
  });

  socket.on('host:end-game', (data) => {
    const pin = data.pin || socket.data.pin;
    clearRoomTimer(pin);
    sendGameEnd(pin);
  });

  socket.on('disconnect', () => {
    const pin = socket.data.pin;
    if (!pin) return;

    if (socket.data.role === 'host') {
      io.to(`room:${pin}`).emit('host:disconnected');
    } else if (socket.data.role === 'player') {
      removePlayer(pin, socket.data.playerId);
      const room = getRoom(pin);
      if (room) {
        io.to(`room:${pin}`).emit('player:left', {
          players: room.players,
          count: room.players.length,
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
