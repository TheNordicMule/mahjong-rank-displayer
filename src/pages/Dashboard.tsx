import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game, PlayerStats, TrendPoint } from '../types';
import { useGames } from '../hooks/useGames';
import { getPlayerStats, getPointsTrend } from '../utils/stats';
import StatCard from '../components/StatCard';
import PlacementBars from '../components/PlacementBars';
import PlacementPie from '../components/PlacementPie';
import RankTrend from '../components/RankTrend';
import PointsTrend from '../components/PointsTrend';
import Leaderboard from '../components/Leaderboard';
import { formatSigned } from '../utils/format';
import './Dashboard.css';

export default function Dashboard() {
  const { games, loading, error } = useGames();
  const [selected, setSelected] = useState<string>('');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [pointsTrend, setPointsTrend] = useState<TrendPoint[]>([]);
  const navigate = useNavigate();

  const players = useMemo(() => {
    const nameSet = new Set<string>();
    games.forEach((g: Game) => {
      g.players.forEach((p) => {
        if (p.name && p.name.trim()) {
          nameSet.add(p.name.trim());
        }
      });
    });
    return Array.from(nameSet).sort();
  }, [games]);

  useEffect(() => {
    if (!selected && players.length > 0) {
      setSelected(players[0]);
    }
  }, [players, selected]);

  useEffect(() => {
    if (selected) {
      setStats(getPlayerStats(games, selected));
      setPointsTrend(getPointsTrend(games, selected));
    } else {
      setStats(null);
      setPointsTrend([]);
    }
  }, [selected, games]);

  const handleSelect = (name: string): void => {
    setSelected(name);
  };

  if (loading) {
    return (
      <div className="dashboard page-mount">
        <h1 className="page-title">Mahjong Tracker</h1>
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard page-mount">
        <h1 className="page-title">Mahjong Tracker</h1>
        <div className="error-box">Error loading data: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard page-mount">
      <h1 className="page-title">Mahjong Tracker</h1>

      {/* Player selector */}
      {players.length > 0 ? (
        <div className="selector-section">
          <span className="selector-label">Select player</span>
          <div className="player-strip">
            {players.map((name) => (
              <button
                key={name}
                className={`player-chip ${name === selected ? 'chip-selected' : ''}`}
                onClick={() => handleSelect(name)}
                aria-pressed={name === selected}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>
            No players yet.
            <br />
            Record your first game to start tracking stats.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/record')}>
            Record Game
          </button>
        </div>
      )}

      {/* Stats panel */}
      {stats && (
        <>
          <div className="stats-grid">
            <StatCard label="Total Games" value={String(stats.totalGames)} />
            <StatCard label="Average Rank" value={String(stats.avgRank)} sub="rank" />
            <StatCard label="Average Score" value={String(stats.avgScore)} />
            <StatCard label="Total Points" value={String(stats.totalPoints)} sub="with uma" />
          </div>

          <div className="secondary-stats" aria-label="Additional player metrics">
            <StatCard label="Top 2 rate" value={stats.totalGames > 0 ? `${stats.top2Rate}%` : '—'} sub="1st or 2nd" />
            <StatCard label="Average points/game" value={stats.totalGames > 0 ? formatSigned(stats.totalPoints / stats.totalGames) : '—'} sub="with uma" />
            <StatCard label="Chombo rate" value={stats.totalGames > 0 ? `${Math.round((stats.totalChombos / stats.totalGames) * 1000) / 10}%` : '—'} sub={`${stats.totalChombos} of ${stats.totalGames} games`} />
            <StatCard
              label="Points range"
              value={<span className="stat-range-value"><span className="stat-range-best">Best {stats.totalGames > 0 ? formatSigned(stats.bestPoints) : '—'}</span><span className="stat-range-worst">Worst {stats.totalGames > 0 ? formatSigned(stats.worstPoints) : '—'}</span></span>}
              sub="single-game result"
            />
          </div>

          <div className="section card">
            <h3 className="section-title">Placement Distribution</h3>
            <div className="placement-distribution">
              <PlacementPie placement={stats.placement} totalGames={stats.totalGames} />
              <PlacementBars placement={stats.placement} totalGames={stats.totalGames} />
            </div>
          </div>

          <div className="section card">
            <h3 className="section-title">Last {stats.lastRanks.length} Ranks</h3>
            <RankTrend ranks={stats.lastRanks} />
          </div>

          <div className="section card">
            <PointsTrend trend={pointsTrend} />
          </div>
        </>
      )}

      {players.length > 0 && (
        <div className="section card">
          <h3 className="section-title">Leaderboard (Total Points)</h3>
          <Leaderboard games={games} />
        </div>
      )}

      {players.length > 0 && (
        <div className="action-row">
          <button className="btn btn-primary" onClick={() => navigate('/record')}>
            Record Game
          </button>
        </div>
      )}
    </div>
  );
}
