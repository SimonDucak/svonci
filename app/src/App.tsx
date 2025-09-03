import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AddGamePage from './pages/AddGamePage';
import GamesListPage from './pages/GamesListPage';
import GamePage from './pages/GamePage';
import './assets/style.css';

export default function App(): JSX.Element {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamesListPage />} />
        <Route path="/new" element={<AddGamePage />} />
        <Route path="/:id" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}