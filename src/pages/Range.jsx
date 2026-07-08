import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGames, getGamesRange } from '../utils/storage';
import { processGame } from '../utils/scoring';
import { getLeaderboard } from '../utils/stats';
import { formatSigned } from '../utils/format';
import StatCard from '../components/StatCard';
import './Range.css';

export default function Range() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [results, setResults] = useState(null);
  const [rangeCount, setRangeCount] = useState(0);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const games = await getGames();
        setTotalGames(games.length);
        if (games.length > 0) {
          setEnd(String(games.length));
        }
      } catch (e) {
        setError('Failed to load game count');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCalculate = async () => {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);

    if (isNaN(s) || isNaN(e)) {
      setError('Please enter valid numbers for both fields.');
      return;
    }

    if (s > e) {
      setError('Start game must be less than or equal to end game.');
      return;
    }

    setError('');
    setWarnings('');
    setFetching(true);
    setResults(null);

    try {
      const clampedStart = Math.max(1, s);
      const clampedEnd = totalGames > 0 ? Math.min(totalGames, e) : e;

      if (clampedStart > clampedEnd) {
        setError('No games in the selected range.');
        setFetching(false);
        return;
      }

      const games = await getGamesRange(clampedStart, clampedEnd);

      if (!games || games.length === 0) {
        setRangeCount(0);
        setResults([]);
      } else {
        setRangeCount(games.length);
        const leaderboard = getLeaderboard(games);

        // Compute raw placement counts (getLeaderboard only gives %)
        const rawCounts = {};
        games.forEach(game => {
          const processed = processGame(game);
          processed.forEach(p => {
            if (!rawCounts[p.name]) {
              rawCounts[p.name] = { 1: 0, 2: 0, 3: 0, 4: 0 };
            }
            rawCounts[p.name][p.rank]++;
          });
        });

        const enriched = leaderboard.map(p => ({
          ...p,
          avgPoints: p.games > 0
            ? Math.round((p.totalPoints / p.games) * 100) / 100
            : 0,
          placementCount: rawCounts[p.name] || { 1: 0, 2: 0, 3: 0, 4: 0 }
        }));

        setResults(enriched);
      }

      if (s !== clampedStart || e !== clampedEnd) {
        const msgs = [];
        if (s !== clampedStart) msgs.push(`Start clamped to ${clampedStart}`);
        if (e !== clampedEnd) msgs.push(`End clamped to ${clampedEnd}`);
        setWarnings(`Range adjusted: ${msgs.join(', ')}.`);
      }
    } catch (e) {
      setError(`Error fetching games: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="range page-mount">
        <h1 className="page-title">Range Aggregation</h1>
        <p className="loading-text">Loading…</p>
      </div>
    );
  }

  const hasResults = results !== null;

  return (
    <div className="range page-mount">
      <h1 className="page-title">Range Aggregation</h1>

      <div className="range-inputs card">
        <div className="range-fields">
          <div className="range-field">
            <label className="range-label" htmlFor="start-game">From game #</label>
            <input
              id="start-game"
              className="input"
              type="number"
              min="1"
              max={totalGames || 1}
              value={start}
              onChange={e => setStart(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="range-sep">→</div>
          <div className="range-field">
            <label className="range-label" htmlFor="end-game">To game #</label>
            <input
              id="end-game"
              className="input"
              type="number"
              min="1"
              max={totalGames || 1}
              value={end}
              onChange={e => setEnd(e.target.value)}
              placeholder={totalGames > 0 ? String(totalGames) : '?'}
            />
          </div>
        </div>
        <div className="range-bounds-hint">
          {totalGames > 0
            ? `Total games: ${totalGames} (valid range: 1 – ${totalGames})`
            : 'No games recorded yet'}
        </div>
        <button
          className="btn btn-primary range-calc-btn"
          onClick={handleCalculate}
          disabled={fetching || totalGames === 0}
        >
          {fetching ? 'Calculating…' : 'Calculate'}
        </button>
      </div>

      {error && (
        <div className="error-box">{error}</div>
      )}

      {warnings && !error && (
        <div className="warning-box">{warnings}</div>
      )}

      {hasResults && results.length === 0 && (
        <div className="empty-state">
          <p>No games found in the selected range.</p>
        </div>
      )}

      {hasResults && results.length > 0 && (
        <>
          <div className="stats-grid">
            <StatCard label="Games in Range" value={String(rangeCount)} />
            <StatCard label="Players" value={String(results.length)} />
          </div>

          <div className="range-results card">
            <h3 className="section-title">Player Rankings (sorted by total points)</h3>
            <div className="range-table">
              <div className="range-table-header">
                <span className="rt-col rt-rank">#</span>
                <span className="rt-col rt-name">Player</span>
                <span className="rt-col rt-games">GP</span>
                <span className="rt-col rt-total">Total</span>
                <span className="rt-col rt-avg">Avg</span>
                <span className="rt-col rt-placements">1st/2nd/3rd/4th</span>
              </div>
              {results.map((p, i) => (
                <div key={p.name} className="range-table-row">
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
                  <span className="rt-col rt-avg">
                    {p.avgPoints > 0 ? '+' : ''}{p.avgPoints.toFixed(1)}
                  </span>
                  <span className="rt-col rt-placements">
                    {[1, 2, 3, 4].map(r => (
                      <span key={r} className={`placement-count rank-${r}`}>
                        {p.placementCount[r]}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
