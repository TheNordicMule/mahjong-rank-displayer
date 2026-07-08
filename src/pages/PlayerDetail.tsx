import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { PlayerStats, TrendPoint, ProcessedPlayer } from '../types';
import { useGames } from '../hooks/useGames';
import { getPlayerStats, getLastRanks, getPointsTrend } from '../utils/stats';
import { processGame } from '../utils/scoring';
import { formatDate, formatSigned } from '../utils/format';
import StatCard from '../components/StatCard';
import PlacementBars from '../components/PlacementBars';
import RankTrend from '../components/RankTrend';
import PointsTrend from '../components/PointsTrend';
import './PlayerDetail.css';

interface GameHistoryEntry {
  date: string;
  rank: number;
  points: number;
  rawScore: number;
  chombo: boolean;
}

export default function PlayerDetail() {
  const { name } = useParams();
  const { games, loading, error } = useGames();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [lastRanks, setLastRanks] = useState<number[]>([]);
  const [pointsTrend, setPointsTrend] = useState<TrendPoint[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);

  useEffect(() => {
    if (!name) return;
    const playerStats = getPlayerStats(games, name);
    setStats(playerStats);

    const ranks = getLastRanks(games, name, 20);
    setLastRanks(ranks);

    const trend = getPointsTrend(games, name);
    setPointsTrend(trend);

    const history: GameHistoryEntry[] = [];
    for (const game of [...games].sort((a, b) => b.timestamp - a.timestamp)) {
      const processed = processGame(game);
      const entry = processed.find((p) => p.name === name);
      if (entry) {
        history.push({
          date: formatDate(game.timestamp),
          rank: entry.rank,
          points: entry.points,
          rawScore: entry.rawScore,
          chombo: entry.chombo,
        });
      }
    }
    setGameHistory(history);
  }, [name, games]);

  if (loading) {
    return (
      <div className="player-detail page-mount">
        <div className="detail-header">
          <Link to="/" className="back-link">
            ← Back to Dashboard
          </Link>
          <h1 className="page-title">{name}</h1>
        </div>
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="player-detail page-mount">
        <div className="detail-header">
          <Link to="/" className="back-link">
            ← Back to Dashboard
          </Link>
          <h1 className="page-title">{name}</h1>
        </div>
        <div className="error-box">Error loading data: {error}</div>
      </div>
    );
  }

  return (
    <div className="player-detail page-mount">
      <div className="detail-header">
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
        <h1 className="page-title">{name}</h1>
      </div>

      {stats && stats.totalGames > 0 && (
        <>
          <div className="stats-grid">
            <StatCard label="Total Games" value={String(stats.totalGames)} />
            <StatCard label="Average Rank" value={String(stats.avgRank)} sub="rank" />
            <StatCard label="Average Score" value={String(stats.avgScore)} />
            <StatCard label="Total Points" value={String(stats.totalPoints)} sub="with uma" />
          </div>

          <div className="section card">
            <h3 className="section-title">Placement Distribution</h3>
            <PlacementBars placement={stats.placement} totalGames={stats.totalGames} />
          </div>

          <div className="section card">
            <h3 className="section-title">Last {lastRanks.length} Ranks</h3>
            <RankTrend ranks={lastRanks} />
          </div>

          <div className="section card">
            <PointsTrend trend={pointsTrend} />
          </div>
        </>
      )}

      {gameHistory.length > 0 && (
        <div className="section">
          <h3 className="section-title">Game History</h3>
          <div className="history-list">
            {gameHistory.map((g, i) => (
              <div className="history-item card" key={i}>
                <div className="history-date">{g.date}</div>
                <div className="history-detail">
                  <span className={`history-rank rank-${g.rank}`}>
                    {g.rank}位{g.chombo && <span className="chombo-badge">Chombo</span>}
                  </span>
                  <span className="history-score">
                    <span className="history-label">Score</span>
                    {g.rawScore.toLocaleString()}
                  </span>
                  <span className="history-points">
                    <span className="history-label">Points</span>
                    {formatSigned(g.points)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!stats || stats.totalGames === 0) && (
        <div className="empty-state">
          <p>No games recorded for {name}.</p>
          <Link to="/record" className="btn btn-primary">
            Record Game
          </Link>
        </div>
      )}
    </div>
  );
}
