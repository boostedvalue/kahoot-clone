import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import CreateGame from './pages/CreateGame.jsx';
import Lobby from './pages/Lobby.jsx';
import GameHost from './pages/GameHost.jsx';
import GamePlayer from './pages/GamePlayer.jsx';
import JoinGame from './pages/JoinGame.jsx';
import Podium from './pages/Podium.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateGame />} />
      <Route path="/lobby/:pin" element={<Lobby />} />
      <Route path="/game/:pin" element={<GameHost />} />
      <Route path="/join" element={<JoinGame />} />
      <Route path="/play/:pin" element={<GamePlayer />} />
      <Route path="/podium/:pin" element={<Podium />} />
    </Routes>
  );
}
