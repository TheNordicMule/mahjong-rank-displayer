import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Game, ProcessedPlayer } from '../types';
import { useGames } from '../hooks/useGames';
import { processGame } from '../utils/scoring';
import { formatDate, formatSigned } from '../utils/format';
import './History.css';

export default function History() {
  const { games, loading, error, deleteGame } = useGames();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [playerFilter, setPlayerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const deleteTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const allMapped = useMemo(() => {
    // Chronological game number comes from ascending timestamp order
    // (game #1 is the earliest ever played). Display order is descending
    // so the most recent game appears first — independent of API order.
    const numberById = new Map(
      [...games].sort((a, b) => a.timestamp - b.timestamp).map((g, i) => [g.id, i + 1] as const),
    );
    return [...games]
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((g) => {
        const processed = processGame(g);
        return {
          id: g.id,
          gameNumber: numberById.get(g.id) ?? 0,
          date: formatDate(g.timestamp),
          players: processed,
        };
      });
  }, [games]);

  const players = useMemo(() => Array.from(new Set(allMapped.flatMap((g) => g.players.map((p) => p.name)))).sort(), [allMapped]);
  const mapped = useMemo(() => allMapped.filter((g) => {
    const day = g.date.slice(0, 10);
    const hasPlayer = !playerFilter || g.players.some((p) => p.name === playerFilter);
    return hasPlayer && (!fromDate || day >= fromDate) && (!toDate || day <= toDate) && !hiddenIds.has(g.id);
  }), [allMapped, playerFilter, fromDate, toDate, hiddenIds]);

  const handleDelete = async (id: string): Promise<void> => {
    if (deleteTimer.current) window.clearTimeout(deleteTimer.current);
    const game = allMapped.find((item) => item.id === id);
    setDeleteError('');
    setHiddenIds((prev) => new Set(prev).add(id));
    setPendingDelete({ id, name: game ? `Game #${game.gameNumber}` : 'Game' });
    deleteTimer.current = window.setTimeout(async () => {
      setDeleting(id);
      try { await deleteGame(id); setPendingDelete(null); }
      catch (e) { setDeleteError(`Could not delete ${game?.gameNumber ? `game #${game.gameNumber}` : 'game'}: ${e instanceof Error ? e.message : String(e)}`); setHiddenIds((prev) => { const next = new Set(prev); next.delete(id); return next; }); setPendingDelete(null); }
      finally { setDeleting(null); }
    }, 5000);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    if (deleteTimer.current) window.clearTimeout(deleteTimer.current);
    setHiddenIds((prev) => { const next = new Set(prev); next.delete(pendingDelete.id); return next; });
    setPendingDelete(null);
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

      <div className="history-filters card">
        <label className="history-filter"><span>Player</span><select className="input" value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)}><option value="">All players</option>{players.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label className="history-filter"><span>From date</span><input className="input" type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} /></label>
        <label className="history-filter"><span>To date</span><input className="input" type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} /></label>
        {(playerFilter || fromDate || toDate) && <button className="btn btn-secondary clear-filters" onClick={() => { setPlayerFilter(''); setFromDate(''); setToDate(''); }}>Clear</button>}
      </div>
      {deleteError && <div className="error-box" role="alert">{deleteError}</div>}

      {mapped.length === 0 && allMapped.length === 0 && (
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

      {mapped.length === 0 && allMapped.length > 0 && <div className="empty-state"><p>No games match these filters.</p></div>}
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
      {pendingDelete && <div className="undo-toast" role="status"><span>{pendingDelete.name} moved to trash.</span><button className="btn btn-secondary" onClick={undoDelete}>Undo</button></div>}
    </div>
  );
}
