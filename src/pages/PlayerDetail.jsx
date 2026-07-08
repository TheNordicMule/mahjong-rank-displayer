import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGames } from '../utils/storage';
import { getPlayerStats, getLastRanks, getPointsTrend } from '../utils/stats';
import { processGame } from '../utils/scoring';
import { formatDate, formatSigned } from '../utils/format';
import StatCard from '../components/StatCard';
import PlacementBars from '../components/PlacementBars';
import RankTrend from '../components/RankTrend';
import PointsTrend from '../components/PointsTrend';
import './PlayerDetail.css';

export default function PlayerDetail() {
  const { name } = useParams();
  const [stats, setStats] = useState(null);
  const [lastRanks, setLastRanks] = useState([]);
  const [pointsTrend, setPointsTrend] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);

  useEffect(() => {
    const games = getGames();
    if (name) {
      const playerStats = getPlayerStats(games, name);
      setStats(playerStats);

      const ranks = getLastRanks(games, name, 20);
      setLastRanks(ranks);

      const trend = getPointsTrend(games, name);
      setPointsTrend(trend);

      const history = [];
      for (const game of games) {
        const processed = processGame(game);
        const entry = processed.find(p => p.name === name);
        if (entry) {
          history.push({
            date: formatDate(game.timestamp),
            rank: entry.rank,
            points: entry.points,
            rawScore: entry.rawScore
          });
        }
      }
      setGameHistory(history);
    }
  }, [name]);

  return (
    <div className="player-detail page-mount">
      <div className="detail-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
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
                  <span className={`history-rank rank-${g.rank}`}>{g.rank}位</span>
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
