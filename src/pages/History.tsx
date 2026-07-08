import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Game, ProcessedPlayer } from '../types';
import { useGames } from '../hooks/useGames';
import { processGame } from '../utils/scoring';
import { formatDate, formatSigned } from '../utils/format';
import './History.css';

export default function History() {
  const { games, loading, error, deleteGame } = useGames();
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const mapped = useMemo(() => {
    // games arrive from the API ordered by timestamp ASC; compute the
    // chronological game number from that order, then reverse so the most
    // recent game is displayed first.
    return games
      .map((g: Game, index: number) => {
        const processed = processGame(g);
        return {
          id: g.id,
          gameNumber: index + 1,
          date: formatDate(g.timestamp),
          players: processed,
        };
      })
      .reverse();
  }, [games]);

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Delete this game record?')) return;
    setDeleting(id);
    try {
      await deleteGame(id);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="history page-mount">
        <h1 className="page-title">Game History</h1>
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history page-mount">
        <h1 className="page-title">Game History</h1>
        <div className="error-box">Error loading data: {error}</div>
      </div>
    );
  }

  return (
    <div className="history page-mount">
      <h1 className="page-title">Game History</h1>

      {mapped.length === 0 && (
        <div className="empty-state">
          <p>
            No games recorded yet.
            <br />
            Record your first match to see it here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/record')}>
            Record Game
          </button>
        </div>
      )}

      <div className="game-list">
        {mapped.map((g) => (
          <div className="game-item card" key={g.id}>
            <div className="game-header">
              <div className="game-date">
                <span className="game-number">#{g.gameNumber}</span>
                {g.date}
              </div>
              <div className="game-actions">
                <button
                  className="btn edit-btn"
                  onClick={() => navigate(`/record/${g.id}`)}
                  disabled={deleting === g.id}
                  aria-label="Edit game"
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger delete-btn"
                  onClick={() => handleDelete(g.id)}
                  disabled={deleting === g.id}
                  aria-label="Delete game"
                >
                  {deleting === g.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
            <div className="game-players">
              {g.players.map((p: ProcessedPlayer) => (
                <div key={p.name} className={`game-player-row rank-${p.rank}`}>
                  <span className={`player-rank-badge rank-${p.rank}`}>{p.rank}</span>
                  <Link to={`/player/${encodeURIComponent(p.name)}`} className="player-link">
                    {p.name}
                    {p.chombo && <span className="chombo-badge">Chombo</span>}
                  </Link>
                  <span className="player-scores">
                    <span className="player-raw-score">{p.rawScore.toLocaleString()}</span>
                    <span className="player-points">{formatSigned(p.points)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
