import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket.js';

export default function CreateGame() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    topic: 'conocimiento-general',
    difficulty: 'medio',
    questionCount: '5',
    advanceMode: 'manual',
    timeLimit: '20',
    showOnPlayers: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleCreate = () => {
    setLoading(true);
    setError('');
    if (!socket.connected) socket.connect();

    socket.emit('host:create-room', {
      topic: form.topic,
      difficulty: form.difficulty,
      questionCount: parseInt(form.questionCount),
      advanceMode: form.advanceMode,
      timeLimit: parseInt(form.timeLimit) || 20,
      showOnPlayers: form.showOnPlayers,
    }, (response) => {
      setLoading(false);
      if (response.ok) {
        localStorage.setItem('qrDataUrl', response.qrDataUrl || '');
        navigate(`/lobby/${response.pin}`);
      } else {
        setError(response.error || 'Error al crear sala');
      }
    });
  };

  return (
    <div className="page" style={{ position: 'relative' }}>
      <button className="back-btn" onClick={() => navigate('/')}>← Volver</button>
      <div className="container" style={{ marginTop: 60 }}>
        <h1 className="page-title">Crear Sala de Juego</h1>
        <div className="card">
          <div className="create-form">
            <div className="form-group">
              <label>Tópico</label>
              <select value={form.topic} onChange={e => setForm({...form, topic: e.target.value})}>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Dificultad</label>
                <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
                  <option value="facil">Fácil</option>
                  <option value="medio">Medio</option>
                  <option value="algo-dificil">Algo Difícil</option>
                  <option value="super-dificil">Super Difícil</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cantidad de Preguntas</label>
                <select value={form.questionCount} onChange={e => setForm({...form, questionCount: e.target.value})}>
                  {[3,5,8,10,15,20].map(n => (
                    <option key={n} value={n}>{n} preguntas</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Avance de Preguntas</label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400, fontSize: 14 }}>
                  <input
                    type="radio"
                    name="advance"
                    checked={form.advanceMode === 'manual'}
                    onChange={() => setForm({...form, advanceMode: 'manual'})}
                  />
                  Manual (yo controlo)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400, fontSize: 14 }}>
                  <input
                    type="radio"
                    name="advance"
                    checked={form.advanceMode === 'auto'}
                    onChange={() => setForm({...form, advanceMode: 'auto'})}
                  />
                  Automático
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Tiempo por Pregunta (segundos)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={form.timeLimit}
                onChange={e => setForm({...form, timeLimit: e.target.value})}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#2a1f4e', color: '#fff', fontSize: 16, width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Mostrar preguntas en dispositivos de jugadores</label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400, fontSize: 14 }}>
                  <input
                    type="radio"
                    name="showOnPlayers"
                    checked={form.showOnPlayers === true}
                    onChange={() => setForm({...form, showOnPlayers: true})}
                  />
                  Sí, mostrar en cada jugador
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400, fontSize: 14 }}>
                  <input
                    type="radio"
                    name="showOnPlayers"
                    checked={form.showOnPlayers === false}
                    onChange={() => setForm({...form, showOnPlayers: false})}
                  />
                  Solo en pantalla central
                </label>
              </div>
            </div>

            {error && <div style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</div>}

            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando sala...' : 'Crear Sala'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
