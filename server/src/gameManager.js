import { v4 as uuidv4 } from 'uuid';
import { fetchQuestions, CATEGORIES } from './questionService.js';

const rooms = new Map();

const AVATARS = [
  { id: 1, emoji: '🦁', color: '#FF6B35' },
  { id: 2, emoji: '🐯', color: '#FF8C42' },
  { id: 3, emoji: '🐸', color: '#2ECC71' },
  { id: 4, emoji: '🐲', color: '#E74C3C' },
  { id: 5, emoji: '🦊', color: '#E67E22' },
  { id: 6, emoji: '🐼', color: '#2C3E50' },
  { id: 7, emoji: '🐨', color: '#8E44AD' },
  { id: 8, emoji: '🦄', color: '#9B59B6' },
  { id: 9, emoji: '🐙', color: '#3498DB' },
  { id: 10, emoji: '🦋', color: '#1ABC9C' },
  { id: 11, emoji: '🐢', color: '#27AE60' },
  { id: 12, emoji: '🦅', color: '#F39C12' },
];

const TIME_LIMITS = {
  'facil': 30,
  'medio': 20,
  'algo-dificil': 15,
  'super-dificil': 10,
};

function generatePin() {
  let pin;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms.has(pin));
  return pin;
}

function calculateScore(answerTimeMs, timeLimitSeconds, isCorrect) {
  if (!isCorrect) return 0;
  const timeLimitMs = timeLimitSeconds * 1000;
  const ratio = Math.max(0, Math.min(1, 1 - (answerTimeMs / timeLimitMs)));
  return Math.round(ratio * 1000);
}

export function createRoom(data) {
  const roomId = uuidv4().slice(0, 8);
  const pin = generatePin();
  const room = {
    id: roomId,
    pin,
    hostId: data.hostId,
    topic: data.topic,
    topicName: CATEGORIES[data.topic]?.name || data.topic,
    difficulty: data.difficulty,
    questionCount: data.questionCount,
    advanceMode: data.advanceMode || 'manual',
    players: [],
    questions: [],
    currentQuestionIndex: -1,
    state: 'waiting',
    questionStartTime: null,
    answers: [],
    scores: {},
  };
  rooms.set(pin, room);
  return { pin, roomId, room };
}

export async function startGame(pin) {
  const room = rooms.get(pin);
  if (!room) throw new Error('Room not found');

  const questions = await fetchQuestions(room.questionCount, room.topic, room.difficulty);
  room.questions = questions;
  room.state = 'playing';
  room.currentQuestionIndex = -1;
  room.scores = {};
  room.players.forEach(p => {
    room.scores[p.id] = 0;
  });

  return questions.length;
}

export function getCurrentQuestion(pin) {
  const room = rooms.get(pin);
  if (!room) throw new Error('Room not found');
  const idx = room.currentQuestionIndex;
  if (idx < 0 || idx >= room.questions.length) return null;
  return {
    ...room.questions[idx],
    questionNumber: idx + 1,
    totalQuestions: room.questions.length,
    timeLimit: TIME_LIMITS[room.difficulty] || 20,
  };
}

export function nextQuestion(pin) {
  const room = rooms.get(pin);
  if (!room) throw new Error('Room not found');
  room.currentQuestionIndex++;
  room.questionStartTime = Date.now();
  room.answers = [];
  return getCurrentQuestion(pin);
}

export function submitAnswer(pin, playerId, optionIndex) {
  const room = rooms.get(pin);
  if (!room) throw new Error('Room not found');
  if (room.state !== 'playing') return null;

  const question = room.questions[room.currentQuestionIndex];
  if (!question) return null;

  const alreadyAnswered = room.answers.find(a => a.playerId === playerId);
  if (alreadyAnswered) return null;

  const correctOptionIndex = question.options.findIndex(o => o.correct);
  const isCorrect = optionIndex === correctOptionIndex;
  const answerTime = Date.now() - room.questionStartTime;
  const points = calculateScore(answerTime, TIME_LIMITS[room.difficulty] || 20, isCorrect);

  room.answers.push({ playerId, optionIndex, isCorrect, points, answerTime });
  room.scores[playerId] = (room.scores[playerId] || 0) + points;

  return {
    isCorrect,
    points,
    correctOptionIndex,
    answerTime,
  };
}

export function getLeaderboard(pin) {
  const room = rooms.get(pin);
  if (!room) return [];
  return room.players
    .map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: room.scores[p.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);
}

export function getPodium(pin) {
  const lb = getLeaderboard(pin);
  return lb.slice(0, 3);
}

export function endGame(pin) {
  const room = rooms.get(pin);
  if (!room) return;
  room.state = 'finished';
}

export function addPlayer(pin, playerData) {
  const room = rooms.get(pin);
  if (!room) throw new Error('Room not found');
  if (room.state !== 'waiting') throw new Error('Game already started');

  const player = {
    id: uuidv4().slice(0, 8),
    nickname: playerData.nickname,
    avatar: playerData.avatar || AVATARS[0],
    connected: true,
  };
  room.players.push(player);
  room.scores[player.id] = 0;
  return player;
}

export function removePlayer(pin, playerId) {
  const room = rooms.get(pin);
  if (!room) return;
  room.players = room.players.filter(p => p.id !== playerId);
  delete room.scores[playerId];
}

export function getRoom(pin) {
  return rooms.get(pin);
}

export function getAllAnswersCount(pin) {
  const room = rooms.get(pin);
  return room?.answers.length || 0;
}

export function getPlayerCount(pin) {
  const room = rooms.get(pin);
  return room?.players.length || 0;
}

export { AVATARS, CATEGORIES, TIME_LIMITS };
