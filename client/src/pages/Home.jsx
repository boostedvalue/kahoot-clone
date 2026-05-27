import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home-logo">🎮</div>
      <h1>Triviahoot</h1>
      <p>Juega trivias en vivo con tus amigos</p>
      <div className="home-buttons">
        <button className="home-btn home-btn-create" onClick={() => navigate('/create')}>
          Crear Sala
        </button>
        <button className="home-btn home-btn-join" onClick={() => navigate('/join')}>
          Unirse a Sala
        </button>
      </div>
    </div>
  );
}
