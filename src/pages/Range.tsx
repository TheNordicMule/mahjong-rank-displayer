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

export default function Range() {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalGames, setTotalGames] = useState<number>(0);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);
  const [results, setResults] = useState<RangeResult[] | null>(null);
  const [rangeCount, setRangeCount] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [warnings, setWarnings] = useState<string>('');
  const [referenceOpen, setReferenceOpen] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const games = await storage.getGames();
        setTotalGames(games.length);
        setAllGames(games);
        if (games.length > 0) {
          setStart('1');
          setEnd(String(games.length));
        }
      } catch (e) {
        setError('Failed to load game count');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const referenceRows = useMemo(() => {
    return allGames.map((g, index) => {
      const processed = processGame(g);
      const winner = processed.find((p) => p.rank === 1);
      return {
        number: index + 1,
        date: formatDate(g.timestamp),
        timestamp: g.timestamp,
        winner: winner?.name || '—',
        id: g.id,
      };
    });
  }, [allGames]);

  const runCalculation = async (s: number, e: number): Promise<void> => {
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

      let games = await storage.getGamesRange(clampedStart, clampedEnd);
      if (startDate || endDate) {
        const from = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity;
        const to = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
        games = games.filter((game) => game.timestamp >= from && game.timestamp <= to);
      }
      games = games.filter((game) => {
        const chronological = [...allGames].sort((a, b) => a.timestamp - b.timestamp);
        const index = chronological.findIndex((item) => item.id === game.id);
        return index >= clampedStart - 1 && index < clampedEnd;
      });

      if (!games || games.length === 0) {
        setRangeCount(0);
        setResults([]);
      } else {
        setRangeCount(games.length);
        const leaderboard = getLeaderboard(games);

        // Compute raw placement counts (getLeaderboard only gives %)
        const rawCounts: Record<string, Placement> = {};
        games.forEach((game) => {
          const processed = processGame(game);
          processed.forEach((p) => {
            if (!rawCounts[p.name]) {
              rawCounts[p.name] = { 1: 0, 2: 0, 3: 0, 4: 0 };
            }
            rawCounts[p.name][p.rank]++;
          });
        });

        const enriched: RangeResult[] = leaderboard.map((p) => ({
          ...p,
          avgPoints: p.games > 0 ? Math.round((p.totalPoints / p.games) * 100) / 100 : 0,
          placementCount: rawCounts[p.name] || { 1: 0, 2: 0, 3: 0, 4: 0 },
        }));

        setResults(enriched);
      }

      if (s !== clampedStart || e !== clampedEnd) {
        const msgs: string[] = [];
        if (s !== clampedStart) msgs.push(`Start clamped to ${clampedStart}`);
        if (e !== clampedEnd) msgs.push(`End clamped to ${clampedEnd}`);
        setWarnings(`Range adjusted: ${msgs.join(', ')}.`);
      }
    } catch (e: unknown) {
      setError(`Error fetching games: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFetching(false);
    }
  };

  const handleCalculate = (): void => {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    const hasNumbers = !isNaN(s) && !isNaN(e);
    const hasDates = startDate !== '' || endDate !== '';

    if (!hasNumbers && !hasDates) {
      setError('Please enter game numbers, a date range, or both.');
      return;
    }

    if (hasNumbers && s > e) {
      setError('Start game must be less than or equal to end game.');
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setError('From date must be on or before to date.');
      return;
    }

    // When only dates are provided, default to the full game-number range
    const normStart = hasNumbers ? s : 1;
    const normEnd = hasNumbers ? e : totalGames;
    runCalculation(normStart, normEnd);
  };

  const applyPreset = (count: number | 'all'): void => {
    if (totalGames === 0) return;
    const endNum = totalGames;
    const startNum = count === 'all' ? 1 : Math.max(1, totalGames - count + 1);
    setStart(String(startNum));
    setEnd(String(endNum));
    // Clear date filters so presets are not silently narrowed by stale dates
    setStartDate('');
    setEndDate('');
    runCalculation(startNum, endNum);
  };

  const handleReferenceSet = (number: number, bound: 'start' | 'end'): void => {
    if (bound === 'start') {
      setStart(String(number));
    } else {
      setEnd(String(number));
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
  const selectedStart = start || (totalGames > 0 ? '1' : '');
  const selectedEnd = end || (totalGames > 0 ? String(totalGames) : '');

  const presets: { key: number | 'all'; label: string }[] = [
    { key: 'all', label: 'All games' },
    { key: 5, label: 'Last 5' },
    { key: 10, label: 'Last 10' },
    { key: 20, label: 'Last 20' },
  ];

  return (
    <div className="range page-mount">
      <h1 className="page-title">Range Aggregation</h1>

      <div className="range-inputs card">
        <div className="range-fields">
          <div className="range-field">
            <label className="range-label" htmlFor="start-game">
              From game #
            </label>
            <input
              id="start-game"
              className="input"
              type="number"
              min="1"
              max={totalGames || 1}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="range-sep">→</div>
          <div className="range-field">
            <label className="range-label" htmlFor="end-game">
              To game #
            </label>
            <input
              id="end-game"
              className="input"
              type="number"
              min="1"
              max={totalGames || 1}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder={totalGames > 0 ? String(totalGames) : '?'}
            />
          </div>
        </div>

        <div className="range-date-fields">
          <div className="range-field"><label className="range-label" htmlFor="start-date">From date (optional)</label><input id="start-date" className="input" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="range-sep">→</div>
          <div className="range-field"><label className="range-label" htmlFor="end-date">To date (optional)</label><input id="end-date" className="input" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>

        <div className="range-presets">
          <span className="range-presets-label">Quick select</span>
          <div className="range-preset-buttons">
            {presets.map((preset) => (
              <button
                key={String(preset.key)}
                className={`btn btn-secondary btn-preset${(((preset.key === 'all' && selectedStart === '1') || (typeof preset.key === 'number' && selectedStart === String(Math.max(1, totalGames - preset.key + 1)))) && selectedEnd === String(totalGames)) ? ' is-selected' : ''}`}
                onClick={() => applyPreset(preset.key)}
                disabled={totalGames === 0}
                aria-pressed={((preset.key === 'all' && selectedStart === '1') || (typeof preset.key === 'number' && selectedStart === String(Math.max(1, totalGames - preset.key + 1)))) && selectedEnd === String(totalGames)}
              >
                {preset.label}
              </button>
            ))}
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

      {totalGames > 0 && (
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
                      <time className="range-reference-date" dateTime={new Date(row.timestamp).toISOString()}>{row.date}</time>
                      <span className="range-reference-winner">
                        <span className="range-reference-winner-label">Winner</span>
                        {row.winner}
                      </span>
                    </div>
                  </div>
                  <div className="range-reference-actions">
                    <button
                      className={`btn btn-reference${start === String(row.number) ? ' is-selected' : ''}`}
                      onClick={() => handleReferenceSet(row.number, 'start')}
                    >
                      From
                    </button>
                    <button
                      className={`btn btn-reference${end === String(row.number) ? ' is-selected' : ''}`}
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
      )}

      {error && <div className="error-box">{error}</div>}

      {warnings && !error && <div className="warning-box">{warnings}</div>}

      {(start || end || startDate || endDate) && <div className="range-summary" aria-live="polite"><strong>Selected range</strong><span>{selectedStart}–{selectedEnd} games</span>{(startDate || endDate) && <span>{startDate || 'Any date'} → {endDate || 'Any date'}</span>}<span className="range-summary-hint">Press Calculate to update results</span></div>}

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
