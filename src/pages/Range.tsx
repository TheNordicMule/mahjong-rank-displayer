import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Game, LeaderboardEntry, Placement } from '../types';
import * as storage from '../utils/storage';
import { processGame } from '../utils/scoring';
import { getLeaderboard } from '../utils/stats';
import { formatDate, formatSigned } from '../utils/format';
import StatCard from '../components/StatCard';
import './Range.css';

interface RangeResult extends LeaderboardEntry {
  avgPoints: number;
  placementCount: Placement;
}

const PRESETS: { key: number | 'all'; label: string }[] = [
  { key: 'all', label: 'All games' },
  { key: 5, label: 'Last 5' },
  { key: 10, label: 'Last 10' },
  { key: 20, label: 'Last 20' },
];

function formatDay(ts: number): string {
  return formatDate(ts).slice(0, 10);
}

export default function Range() {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [start, setStart] = useState<number>(1);
  const [end, setEnd] = useState<number>(1);
  const [referenceOpen, setReferenceOpen] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const games = await storage.getGames();
        setAllGames(games);
        if (games.length > 0) {
          setStart(1);
          setEnd(games.length);
        }
      } catch (e) {
        setError('Failed to load games');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Game #1 is the earliest game ever played (API returns timestamp ASC,
  // but sort defensively so slider endpoints always map correctly).
  const chronological = useMemo(
    () => [...allGames].sort((a, b) => a.timestamp - b.timestamp),
    [allGames],
  );
  const totalGames = chronological.length;

  const referenceRows = useMemo(() => {
    return chronological.map((g, index) => {
      const processed = processGame(g);
      const winner = processed.find((p) => p.rank === 1);
      return {
        number: index + 1,
        date: formatDay(g.timestamp),
        timestamp: g.timestamp,
        winner: winner?.name || '—',
        id: g.id,
      };
    });
  }, [chronological]);

  // Results are derived locally and update live as the sliders move —
  // no network round-trip or Calculate button needed.
  const selectedGames = useMemo(
    () => chronological.slice(start - 1, end),
    [chronological, start, end],
  );

  const results = useMemo<RangeResult[]>(() => {
    if (selectedGames.length === 0) return [];
    const leaderboard = getLeaderboard(selectedGames);

    // Compute raw placement counts (getLeaderboard only gives %)
    const rawCounts: Record<string, Placement> = {};
    selectedGames.forEach((game) => {
      const processed = processGame(game);
      processed.forEach((p) => {
        if (!rawCounts[p.name]) {
          rawCounts[p.name] = { 1: 0, 2: 0, 3: 0, 4: 0 };
        }
        rawCounts[p.name][p.rank]++;
      });
    });

    return leaderboard.map((p) => ({
      ...p,
      avgPoints: p.games > 0 ? Math.round((p.totalPoints / p.games) * 100) / 100 : 0,
      placementCount: rawCounts[p.name] || { 1: 0, 2: 0, 3: 0, 4: 0 },
    }));
  }, [selectedGames]);

  const handleStartChange = (value: number): void => {
    setStart(Math.min(value, end));
  };

  const handleEndChange = (value: number): void => {
    setEnd(Math.max(value, start));
  };

  const applyPreset = (count: number | 'all'): void => {
    if (totalGames === 0) return;
    setStart(count === 'all' ? 1 : Math.max(1, totalGames - count + 1));
    setEnd(totalGames);
  };

  const isPresetSelected = (key: number | 'all'): boolean => {
    if (totalGames === 0 || end !== totalGames) return false;
    if (key === 'all') return start === 1;
    return start === Math.max(1, totalGames - key + 1);
  };

  // Moving one bound past the other pushes the opposite bound along, so
  // reference picks can never create an inverted range.
  const handleReferenceSet = (number: number, bound: 'start' | 'end'): void => {
    if (bound === 'start') {
      setStart(number);
      if (number > end) setEnd(number);
    } else {
      setEnd(number);
      if (number < start) setStart(number);
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

  const startGame = chronological[start - 1];
  const endGame = chronological[end - 1];
  const rangeCount = end - start + 1;
  // Positions within the full timeline, as percentages, for the selection bar.
  const span = Math.max(totalGames - 1, 1);
  const fromPct = ((start - 1) / span) * 100;
  const toPct = ((end - 1) / span) * 100;

  return (
    <div className="range page-mount">
      <h1 className="page-title">Range Aggregation</h1>

      {error && <div className="error-box">{error}</div>}

      {totalGames === 0 && !error ? (
        <div className="empty-state">
          <p>No games recorded yet.</p>
          <Link to="/record" className="btn btn-primary">
            Record Game
          </Link>
        </div>
      ) : (
        <>
          <div className="range-picker card">
            <div className="range-presets">
              <span className="range-presets-label">Quick select</span>
              <div className="range-preset-buttons">
                {PRESETS.map((preset) => (
                  <button
                    key={String(preset.key)}
                    className={`btn btn-secondary btn-preset${isPresetSelected(preset.key) ? ' is-selected' : ''}`}
                    onClick={() => applyPreset(preset.key)}
                    aria-pressed={isPresetSelected(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="range-slider">
              <div className="range-slider-endpoints">
                <div className="range-endpoint">
                  <span className="range-endpoint-label">From</span>
                  <span className="range-endpoint-value">#{start}</span>
                  {startGame && (
                    <time
                      className="range-endpoint-date"
                      dateTime={new Date(startGame.timestamp).toISOString()}
                    >
                      {formatDay(startGame.timestamp)}
                    </time>
                  )}
                </div>
                <div className="range-endpoint range-endpoint-right">
                  <span className="range-endpoint-label">To</span>
                  <span className="range-endpoint-value">#{end}</span>
                  {endGame && (
                    <time
                      className="range-endpoint-date"
                      dateTime={new Date(endGame.timestamp).toISOString()}
                    >
                      {formatDay(endGame.timestamp)}
                    </time>
                  )}
                </div>
              </div>

              <div className="range-track" aria-hidden="true">
                <div
                  className="range-track-fill"
                  style={{ left: `${fromPct}%`, right: `${100 - toPct}%` }}
                />
              </div>

              <div className="range-slider-row">
                <label className="range-slider-label" htmlFor="range-from">
                  From game
                </label>
                <input
                  id="range-from"
                  className="range-input"
                  type="range"
                  min={1}
                  max={totalGames}
                  step={1}
                  value={start}
                  disabled={totalGames < 2}
                  aria-valuetext={`Game ${start} of ${totalGames}${startGame ? `, ${formatDay(startGame.timestamp)}` : ''}`}
                  onChange={(e) => handleStartChange(Number(e.target.value))}
                />
              </div>
              <div className="range-slider-row">
                <label className="range-slider-label" htmlFor="range-to">
                  To game
                </label>
                <input
                  id="range-to"
                  className="range-input"
                  type="range"
                  min={1}
                  max={totalGames}
                  step={1}
                  value={end}
                  disabled={totalGames < 2}
                  aria-valuetext={`Game ${end} of ${totalGames}${endGame ? `, ${formatDay(endGame.timestamp)}` : ''}`}
                  onChange={(e) => handleEndChange(Number(e.target.value))}
                />
              </div>

              <p className="range-slider-count" aria-live="polite">
                {rangeCount} of {totalGames} games selected
              </p>
            </div>
          </div>

          <div className="range-reference card">
            <button
              className="range-reference-toggle"
              onClick={() => setReferenceOpen((o) => !o)}
              aria-expanded={referenceOpen}
            >
              <span>Game reference</span>
              <span className="range-reference-chevron">{referenceOpen ? '▾' : '▸'}</span>
            </button>
            {referenceOpen && (
              <div className="range-reference-list">
                {referenceRows.map((row) => (
                  <div key={row.id} className="range-reference-row">
                    <div className="range-reference-info">
                      <span className="range-reference-number">#{row.number}</span>
                      <div className="range-reference-meta">
                        <time
                          className="range-reference-date"
                          dateTime={new Date(row.timestamp).toISOString()}
                        >
                          {row.date}
                        </time>
                        <span className="range-reference-winner">
                          <span className="range-reference-winner-label">Winner</span>
                          {row.winner}
                        </span>
                      </div>
                    </div>
                    <div className="range-reference-actions">
                      <button
                        className={`btn btn-reference${start === row.number ? ' is-selected' : ''}`}
                        onClick={() => handleReferenceSet(row.number, 'start')}
                      >
                        From
                      </button>
                      <button
                        className={`btn btn-reference${end === row.number ? ' is-selected' : ''}`}
                        onClick={() => handleReferenceSet(row.number, 'end')}
                      >
                        To
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                    {p.avgPoints > 0 ? '+' : ''}
                    {p.avgPoints.toFixed(1)}
                  </span>
                  <span className="rt-col rt-placements">
                    {[1, 2, 3, 4].map((r) => (
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
