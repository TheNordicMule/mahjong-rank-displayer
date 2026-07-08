import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayers, getGames } from '../utils/storage';
import { getPlayerStats } from '../utils/stats';
import StatCard from '../components/StatCard';
import PlacementBars from '../components/PlacementBars';
import RankTrend from '../components/RankTrend';
import './Dashboard.css';

export default function Dashboard() {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    const p = getPlayers();
    setPlayers(p);
    if (!selected && p.length > 0) {
      setSelected(p[0]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) {
      const games = getGames();
      setStats(getPlayerStats(games, selected));
    } else {
      setStats(null);
    }
  }, [selected]);

  const handleSelect = (name) => {
    setSelected(name);
  };

  return (
    <div className="dashboard page-mount">
      <h1 className="page-title">Mahjong Tracker</h1>

      {/* Player selector */}
      {players.length > 0 ? (
        <div className="selector-section">
          <span className="selector-label">Select player</span>
          <div className="player-strip">
            {players.map(name => (
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
          <p>No players yet.<br />Record your first game to start tracking stats.</p>
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

          <div className="section card">
            <h3 className="section-title">Placement Distribution</h3>
            <PlacementBars placement={stats.placement} totalGames={stats.totalGames} />
          </div>

          <div className="section card">
            <h3 className="section-title">Last {stats.lastRanks.length} Ranks</h3>
            <RankTrend ranks={stats.lastRanks} />
          </div>
        </>
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
