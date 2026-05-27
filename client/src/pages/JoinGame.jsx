import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import socket from '../socket.js';

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

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('pin');
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();
  }, []);

  const handleJoin = () => {
    if (!pin || pin.length !== 6) {
      setError('El PIN debe tener 6 dígitos');
      return;
    }
    setStep('profile');
    setError('');
  };

  const confirmJoin = () => {
    if (!nickname.trim()) {
      setError('Ingresa un nickname');
      return;
    }
    setJoining(true);
    setError('');

    socket.emit('player:join', {
      pin,
      nickname: nickname.trim(),
      avatar: selectedAvatar,
    }, (response) => {
      if (response.ok) {
        localStorage.setItem('playerId', response.player.id);
        localStorage.setItem('playerNick', nickname.trim());
        navigate(`/play/${pin}`);
      } else {
        setError(response.error || 'Error al unirse a la sala');
        setJoining(false);
      }
    });
  };

  if (step === 'pin') {
    return (
      <div className="page">
        <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card join-form">
            <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Unirse a Sala</h2>
            <p style={{ textAlign: 'center', color: '#b8a9d4', marginBottom: 20 }}>
              Ingresa el PIN de 6 dígitos
            </p>
            <div className="form-group">
              <label>PIN de la Sala</label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
              />
            </div>
            {error && <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{error}</div>}
            <button className="btn-primary" onClick={handleJoin}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => setStep('pin')}>← Atrás</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card join-form">
          <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Tu Perfil</h2>
          <p style={{ textAlign: 'center', color: '#b8a9d4', marginBottom: 20 }}>
            Sala: {pin}
          </p>

          <div className="form-group">
            <label>Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Tu nombre..."
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label>Elige tu avatar</label>
            <div className="avatar-grid">
              {AVATARS.map(av => (
                <div
                  key={av.id}
                  className={`avatar-option ${selectedAvatar.id === av.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(av)}
                >
                  <span className="emoji">{av.emoji}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{error}</div>}

          <button className="btn-primary" onClick={confirmJoin} disabled={joining}>
            {joining ? 'Entrando...' : '¡Entrar a la Sala!'}
          </button>
        </div>
      </div>
    </div>
  );
}
