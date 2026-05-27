import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Podium() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [podiumData, setPodiumData] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('podiumData');
      const storedPin = localStorage.getItem('podiumPin');
      if (stored && storedPin === pin) {
        setPodiumData(JSON.parse(stored));
      }
    } catch {}
  }, [pin]);

  if (!podiumData || podiumData.length === 0) {
    return (
      <div className="podium">
        <h1>🏆 Juego Terminado</h1>
        <p className="subtitle">No hay datos del podio disponibles</p>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ maxWidth: 200 }}>
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="podium">
      <h1>🏆 ¡Podio Final!</h1>
      <p className="subtitle">Estos son los ganadores</p>

      <div className="podium-steps">
        {podiumData.length >= 2 && (
          <div className="podium-step second" style={{ animationDelay: '0.2s' }}>
            <div className="placement">2º Lugar</div>
            <div className="avatar">{podiumData[1].avatar.emoji}</div>
            <div className="name">{podiumData[1].nickname}</div>
            <div className="score">{podiumData[1].score} pts</div>
          </div>
        )}
        {podiumData.length >= 1 && (
          <div className="podium-step first" style={{ animationDelay: '0.1s' }}>
            <div className="placement">1º Lugar</div>
            <div className="avatar" style={{ fontSize: 64 }}>{podiumData[0].avatar.emoji}</div>
            <div className="name">{podiumData[0].nickname}</div>
            <div className="score">{podiumData[0].score} pts</div>
          </div>
        )}
        {podiumData.length >= 3 && (
          <div className="podium-step third" style={{ animationDelay: '0.3s' }}>
            <div className="placement">3º Lugar</div>
            <div className="avatar">{podiumData[2].avatar.emoji}</div>
            <div className="name">{podiumData[2].nickname}</div>
            <div className="score">{podiumData[2].score} pts</div>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 500, marginTop: 20 }}>
        <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Tabla Final</h3>
        <div className="leaderboard-list">
          {podiumData.map((p, i) => (
            <div key={p.id} className="leaderboard-item" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="rank">#{i + 1}</span>
              <span className="avatar">{p.avatar.emoji}</span>
              <span className="name">{p.nickname}</span>
              <span className="score">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={() => navigate('/')}
        style={{ maxWidth: 200, marginTop: 24 }}
      >
        Volver al Inicio
      </button>
    </div>
  );
}
