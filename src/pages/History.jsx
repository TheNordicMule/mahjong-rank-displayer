import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGames, deleteGame } from '../utils/storage';
import { processGame } from '../utils/scoring';
import { formatDate, formatSigned } from '../utils/format';
import './History.css';

export default function History() {
  const [games, setGames] = useState([]);
  const navigate = useNavigate();

  const loadGames = () => {
    const raw = getGames();
    const mapped = raw.map(g => {
      const processed = processGame(g);
      return { id: g.id, date: formatDate(g.timestamp), players: processed };
    });
    setGames(mapped);
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('Delete this game record?')) {
      deleteGame(id);
      loadGames();
    }
  };

  return (
    <div className="history page-mount">
      <h1 className="page-title">Game History</h1>

      {games.length === 0 && (
        <div className="empty-state">
          <p>No games recorded yet.<br />Record your first match to see it here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/record')}>
            Record Game
          </button>
        </div>
      )}

      <div className="game-list">
        {games.map(g => (
          <div className="game-item card" key={g.id}>
            <div className="game-header">
              <div className="game-date">{g.date}</div>
              <button
                className="btn btn-danger delete-btn"
                onClick={() => handleDelete(g.id)}
                aria-label="Delete game"
              >
                Delete
              </button>
            </div>
            <div className="game-players">
              {g.players.map(p => (
                <div key={p.name} className={`game-player-row rank-${p.rank}`}>
                  <span className={`player-rank-badge rank-${p.rank}`}>{p.rank}</span>
                  <Link to={`/player/${encodeURIComponent(p.name)}`} className="player-link">
                    {p.name}
                  </Link>
                  <span className="player-points">{formatSigned(p.points)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
