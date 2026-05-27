import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';

export default function Lobby() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [qrUrl, setQrUrl] = useState(localStorage.getItem('qrDataUrl') || '');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('player:joined', (data) => {
      setPlayers(data.players);
    });

    socket.on('player:left', (data) => {
      setPlayers(data.players);
    });

    socket.on('game:started', (data) => {
      setStarted(true);
      navigate(`/game/${pin}`, { state: { firstQuestion: data.question } });
    });

    return () => {
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('game:started');
    };
  }, [pin]);

  const startGame = () => {
    setStarted(true);
    socket.emit('host:start-game', { pin }, (response) => {
      if (!response.ok) {
        setStarted(false);
        alert('Error al iniciar el juego: ' + (response.error || 'Error desconocido'));
      }
    });
  };

  const joinUrl = `${window.location.origin}/join?pin=${pin}`;

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h2>Sala de Juego</h2>
        <div className="lobby-pin">{pin}</div>
        <p style={{ color: '#b8a9d4' }}>
          Comparte este PIN con tus amigos o escanea el QR
        </p>
      </div>

      {qrUrl && (
        <div className="lobby-qr">
          <img src={qrUrl} alt="QR Code" style={{ width: 200, height: 200 }} />
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 600 }}>
        <h3 style={{ marginBottom: 12 }}>
          Jugadores ({players.length})
        </h3>
        <div className="lobby-players">
          {players.length === 0 ? (
            <p style={{ color: '#b8a9d4' }}>Esperando jugadores...</p>
          ) : (
            players.map(p => (
              <div key={p.id} className="player-chip">
                <span className="avatar">{p.avatar.emoji}</span>
                <span className="nickname">{p.nickname}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#b8a9d4', marginTop: -8 }}>
        O abre: <strong>{joinUrl}</strong>
      </div>

      <button
        className="btn-primary"
        onClick={startGame}
        disabled={players.length < 1 || started}
        style={{ maxWidth: 300 }}
      >
        {started ? 'Iniciando...' : (players.length < 1 ? 'Esperando jugadores...' : 'Iniciar Juego')}
      </button>
    </div>
  );
}
