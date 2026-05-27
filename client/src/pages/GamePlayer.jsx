import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';

const COLORS = ['red', 'blue', 'yellow', 'green'];

export default function GamePlayer() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [podium, setPodium] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const playerIdRef = useRef(localStorage.getItem('playerId'));
  const playerNickRef = useRef(localStorage.getItem('playerNick'));

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('question:new', (q) => {
      setQuestion(q);
      setSelected(null);
      setResult(null);
      setShowResult(false);
      setCorrectIndex(null);
      setLeaderboard(null);
      setWaiting(false);
    });

    socket.on('question:reveal', (data) => {
      setCorrectIndex(data.correctOptionIndex);
      setShowResult(true);
    });

    socket.on('leaderboard:update', (data) => {
      setLeaderboard(data);
      setWaiting(true);
      setQuestion(null);
    });

    socket.on('game:end', (data) => {
      setPodium(data.podium);
      localStorage.setItem('podiumData', JSON.stringify(data.podium));
      localStorage.setItem('podiumPin', pin);
    });

    socket.on('host:disconnected', () => {
      navigate('/');
    });

    return () => {
      socket.off('question:new');
      socket.off('question:reveal');
      socket.off('leaderboard:update');
      socket.off('game:end');
      socket.off('host:disconnected');
    };
  }, [pin]);

  const handleAnswer = (optionIndex) => {
    if (selected !== null || showResult) return;
    setSelected(optionIndex);

    socket.emit('player:answer', {
      pin,
      playerId: playerIdRef.current,
      optionIndex,
    }, (response) => {
      if (response.ok) {
        setResult(response.result);
      }
    });
  };

  if (podium) {
    const top3 = podium.slice(0, 3);
    const myScore = podium.find(p => p.id === playerIdRef.current);
    return (
      <div className="podium">
        <h1>🎉 ¡Juego Terminado!</h1>
        <p className="subtitle">
          {myScore ? `Tu puntuación: ${myScore.score} pts` : 'Gracias por jugar'}
        </p>
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
              <div className="avatar">{top3[0].avatar.emoji}</div>
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

  if (leaderboard) {
    return (
      <div className="game-player waiting">
        <h2>🏆 Posiciones</h2>
        <div className="leaderboard-list" style={{ maxWidth: 400, marginTop: 20 }}>
          {leaderboard.leaderboard.map((p, i) => (
            <div key={p.id} className="leaderboard-item" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="rank">#{i + 1}</span>
              <span className="avatar">{p.avatar.emoji}</span>
              <span className="name">{p.nickname}</span>
              <span className="score">{p.score}</span>
            </div>
          ))}
        </div>
        <p className="player-waiting-text">Preparando siguiente pregunta...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="game-player waiting">
        <h2>⌛ {waiting ? 'Esperando...' : 'El juego está por comenzar...'}</h2>
        <p className="player-waiting-text">
          {playerNickRef.current && `¡Buena suerte, ${playerNickRef.current}!`}
        </p>
      </div>
    );
  }

  return (
    <div className="game-player">
      <div className="question-info">
        Pregunta {question.questionNumber} de {question.totalQuestions}
      </div>
      <div className="player-question">{question.question}</div>

      <div className="player-options">
        {question.options.map((opt, i) => {
          let className = `player-option ${COLORS[i]}`;
          if (selected !== null) className += ' disabled';
          if (selected === i) className += ' selected';
          if (showResult && opt.correct) className += ' correct';
          if (showResult && selected === i && !opt.correct) className += ' wrong';
          return (
            <button
              key={i}
              className={className}
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {result && showResult && (
        <div className="player-result" style={{ marginTop: 20, textAlign: 'center' }}>
          {result.isCorrect ? (
            <div>
              <div style={{ fontSize: 48 }}>✅</div>
              <div className="player-score-display">+{result.points}</div>
              <div style={{ color: '#6bcb77', fontWeight: 600 }}>¡Correcto!</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 48 }}>❌</div>
              <div style={{ color: '#ff6b6b', fontWeight: 600 }}>Incorrecto</div>
              <div className="player-score-display" style={{ fontSize: 24 }}>+0 pts</div>
            </div>
          )}
        </div>
      )}

      {selected !== null && !showResult && (
        <p className="player-waiting-text">Esperando a que se revelen las respuestas...</p>
      )}
    </div>
  );
}
