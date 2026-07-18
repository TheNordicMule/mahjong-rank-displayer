import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Game, Placement } from '../types';
import { getLeaderboard } from '../utils/stats';
import { formatSigned } from '../utils/format';
import './Leaderboard.css';

interface LeaderboardProps {
  games: Game[];
}

export default function Leaderboard({ games }: LeaderboardProps) {
  const entries = useMemo(() => {
    if (!games || games.length === 0) return [];
    const lb = getLeaderboard(games);
    return lb.map((p) => {
      const placementCounts: Placement = {};
      for (const r of [1, 2, 3, 4]) {
        placementCounts[r] = Math.round((p.placement[r] / 100) * p.games);
      }
      return { ...p, placementCounts };
    });
  }, [games]);

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>No games recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="card leaderboard-card">
      <div className="leaderboard-table">
        <div className="range-table-header">
          <span className="rt-col rt-rank">#</span>
          <span className="rt-col rt-name">Player</span>
          <span className="rt-col rt-games">GP</span>
          <span className="rt-col rt-total">Total</span>
          <span className="rt-col rt-avg rt-avg-head">
            <span>Avg</span>
            <span>Rank</span>
          </span>
          <span className="rt-col rt-placements">1st/2nd/3rd/4th</span>
          <span className="rt-col rt-chombo">Chombo</span>
        </div>
        {entries.map((p, i) => (
          <div key={p.name} className={`range-table-row${i === 0 ? ' top-row' : ''}`}>
            <span className="rt-col rt-rank">
              <span className={`player-rank-badge rank-${Math.min(i + 1, 4)}`}>{i + 1}</span>
            </span>
            <span className="rt-col rt-name">
              <Link to={`/player/${encodeURIComponent(p.name)}`} className="player-link">
                {p.name}
              </Link>
            </span>
            <span className="rt-col rt-games">{p.games}</span>
            <span className="rt-col rt-total">{formatSigned(p.totalPoints)}</span>
            <span className="rt-col rt-avg">{p.avgRank.toFixed(2)}</span>
            <span className="rt-col rt-placements">
              {[1, 2, 3, 4].map((r) => (
                <span key={r} className={`placement-count rank-${r}`}>
                  {p.placementCounts[r]}
                </span>
              ))}
            </span>
            <span className="rt-col rt-chombo">{p.totalChombos}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
