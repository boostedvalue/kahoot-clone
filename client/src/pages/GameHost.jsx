import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import socket from '../socket.js';

const COLORS = ['red', 'blue', 'yellow', 'green'];
const COLOR_LABELS = ['Rojo', 'Azul', 'Amarillo', 'Verde'];

export default function GameHost() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initQ = location.state?.firstQuestion || null;
  const [question, setQuestion] = useState(initQ);
  const [questionNumber, setQuestionNumber] = useState(initQ?.questionNumber || 0);
  const [totalQuestions, setTotalQuestions] = useState(initQ?.totalQuestions || 0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);
  const [podium, setPodium] = useState(null);
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('question:new', (q) => {
      setQuestion(q);
      setQuestionNumber(q.questionNumber);
      setTotalQuestions(q.totalQuestions);
      setRevealed(false);
      setLeaderboard(null);
      setShowContinue(false);
      setAnswered(0);
    });

    socket.on('answer:count', (data) => {
      setAnswered(data.answered);
      setTotalPlayers(data.total);
    });

    socket.on('question:reveal', () => {
      setRevealed(true);
      setShowContinue(true);
    });

    socket.on('leaderboard:update', (data) => {
      setLeaderboard(data);
      setShowContinue(false);
    });

    socket.on('game:end', (data) => {
      setPodium(data.podium);
      localStorage.setItem('podiumData', JSON.stringify(data.podium));
      localStorage.setItem('podiumPin', pin);
    });

    return () => {
      socket.off('question:new');
      socket.off('answer:count');
      socket.off('question:reveal');
      socket.off('leaderboard:update');
      socket.off('game:end');
    };
  }, [pin]);

  const revealAnswers = () => {
    socket.emit('host:reveal-answers', { pin });
  };

  const nextQuestion = () => {
    socket.emit('host:next-question', { pin }, (response) => {
      if (response.leaderboard) {
        setLeaderboard({ leaderboard: response.leaderboard, showing: true });
      }
      if (response.finished) {
        setPodium(response.podium);
      }
    });
  };

  const continueGame = () => {
    socket.emit('host:continue-after-leaderboard', { pin });
    setLeaderboard(null);
  };

  const endGame = () => {
    socket.emit('host:end-game', { pin });
  };

  if (podium) {
    const top3 = podium.slice(0, 3);
    return (
      <div className="podium">
        <h1>🏆 ¡Juego Terminado!</h1>
        <div className="podium-steps">
          {top3.length >= 2 && (
            <div className="podium-step second" style={{ animationDelay: '0.2s' }}>
              <div className="placement">2º</div>
              <div className="avatar">{top3[1].avatar.emoji}</div>
              <div className="name">{top3[1].nickname}</div>
              <div className="score">{top3[1].score} pts</div>
            </div>
          )}
          {top3.length >= 1 && (
            <div className="podium-step first" style={{ animationDelay: '0.1s' }}>
              <div className="placement">1º</div>
              <div className="avatar" style={{ fontSize: 64 }}>{top3[0].avatar.emoji}</div>
              <div className="name">{top3[0].nickname}</div>
              <div className="score">{top3[0].score} pts</div>
            </div>
          )}
          {top3.length >= 3 && (
            <div className="podium-step third" style={{ animationDelay: '0.3s' }}>
              <div className="placement">3º</div>
              <div className="avatar">{top3[2].avatar.emoji}</div>
              <div className="name">{top3[2].nickname}</div>
              <div className="score">{top3[2].score} pts</div>
            </div>
          )}
        </div>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ maxWidth: 200 }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="game-player waiting">
        <h2 style={{ fontSize: 28 }}>🎮 Preparando juego...</h2>
        <p style={{ color: '#b8a9d4', marginTop: 16 }}>Cargando preguntas...</p>
      </div>
    );
  }

  return (
    <div className="game-host">
      <div className="question-card">
        <h2>Pregunta {questionNumber} de {totalQuestions}</h2>
        <div className="meta">{question.category} · {question.difficulty}</div>
        <div className="question-text">{question.question}</div>

        {!revealed && (
          <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
            <span>{answered}/{totalPlayers} respondieron</span>
          </div>
        )}

        <div className="options-grid">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`option-box ${COLORS[i]}`}
              style={{ opacity: revealed && !opt.correct ? 0.3 : 1 }}
            >
              {COLOR_LABELS[i]}: {opt.text}
            </div>
          ))}
        </div>
      </div>

      <div className="controls">
        {!revealed ? (
          <button className="btn-primary" onClick={revealAnswers} style={{ width: 'auto' }}>
            Mostrar Respuestas
          </button>
        ) : showContinue && questionNumber < totalQuestions ? (
          <button className="btn-primary" onClick={nextQuestion} style={{ width: 'auto' }}>
            Siguiente Pregunta
          </button>
        ) : showContinue && questionNumber >= totalQuestions ? (
          <button className="btn-primary" onClick={endGame} style={{ width: 'auto' }}>
            Finalizar Juego
          </button>
        ) : null}
      </div>

      {leaderboard && (
        <div className="leaderboard-overlay">
          <h2>🏆 Tabla de Posiciones</h2>
          <div className="leaderboard-list">
            {leaderboard.leaderboard.map((p, i) => (
              <div key={p.id} className="leaderboard-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="rank">#{i + 1}</span>
                <span className="avatar">{p.avatar.emoji}</span>
                <span className="name">{p.nickname}</span>
                <span className="score">{p.score}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={continueGame} style={{ maxWidth: 200, marginTop: 20 }}>
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
