import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Player } from '../types';
import * as storage from '../utils/storage';
import './Record.css';

interface PlayerInput { name: string; score: string; chombo: boolean }
const EMPTY_PLAYERS: PlayerInput[] = Array.from({ length: 4 }, () => ({ name: '', score: '', chombo: false }));
const DEFAULT_UMA = [30, 10, -10, -30];
const DEFAULT_RETURN_SCORE = 25000;
const UMA_KEY = 'mahjong-default-uma';
const RETURN_KEY = 'mahjong-default-return-score';

export default function Record() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [players, setPlayers] = useState<PlayerInput[]>(EMPTY_PLAYERS.map((p) => ({ ...p })));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [uma, setUma] = useState<number[]>(DEFAULT_UMA);
  const [returnScore, setReturnScore] = useState(String(DEFAULT_RETURN_SCORE));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [gameNotFound, setGameNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedUma = JSON.parse(localStorage.getItem(UMA_KEY) || 'null');
      if (Array.isArray(savedUma) && savedUma.length === 4) setUma(savedUma.map(Number));
      const savedReturn = localStorage.getItem(RETURN_KEY);
      if (savedReturn) setReturnScore(savedReturn);
    } catch { /* Defaults remain available if storage is unavailable. */ }
    storage.getPlayers().then(setSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoadingGame(true);
    storage.getGames().then((games) => {
      const game = games.find((g) => g.id === id);
      if (!game) setGameNotFound(true);
      else {
        setPlayers(game.players.map((p) => ({ name: p.name, score: String(p.rawScore), chombo: p.chombo })));
        setUma(game.uma?.length === 4 ? game.uma : DEFAULT_UMA);
        setReturnScore(String(game.returnScore ?? DEFAULT_RETURN_SCORE));
      }
      setLoadingGame(false);
    }).catch(() => { setError('Failed to load game.'); setLoadingGame(false); });
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    storage.getLatestNames().then((names) => {
      if (names.length) setPlayers((prev) => prev.map((p, i) => ({ ...p, name: names[i] ?? p.name })));
    }).catch(() => {});
  }, [isEdit]);

  const updatePlayer = (index: number, field: keyof PlayerInput, value: string | boolean) => {
    setPlayers((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
    setError('');
    setFieldErrors((prev) => { const next = { ...prev }; delete next[`${field}-${index}`]; return next; });
  };

  const total = players.reduce((sum, p) => sum + (Number(p.score) || 0), 0);
  const difference = total - 100000;

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    players.forEach((p, i) => {
      if (!p.name.trim()) errors[`name-${i}`] = 'Enter a player name.';
      if (p.score === '' || !Number.isFinite(Number(p.score))) errors[`score-${i}`] = 'Enter a valid score.';
    });
    if (Object.keys(errors).length) { setFieldErrors(errors); setError('Check the highlighted fields.'); return; }
    const names = players.map((p) => p.name.trim());
    if (new Set(names).size !== names.length) { setError('Player names must be unique.'); return; }
    if (total !== 100000) { setError(`Total score must be 100,000 (currently ${total.toLocaleString()}).`); return; }
    if (uma.length !== 4 || uma.some((v) => !Number.isFinite(v))) { setError('Enter four valid uma values.'); return; }
    const parsedReturn = Number(returnScore);
    if (!Number.isFinite(parsedReturn) || parsedReturn <= 0) { setError('Enter a valid return score.'); return; }
    const data: Player[] = players.map((p) => ({ name: p.name.trim(), rawScore: Number(p.score), chombo: p.chombo }));
    setSaving(true);
    try {
      // Compatible with the expanded data-layer signature while older local helpers ignore options.
      const save = storage[isEdit ? 'updateGame' : 'addGame'] as unknown as (...args: unknown[]) => Promise<unknown>;
      if (isEdit) await save(id!, data, { uma, returnScore: parsedReturn });
      else await save(data, { uma, returnScore: parsedReturn });
      localStorage.setItem(UMA_KEY, JSON.stringify(uma));
      localStorage.setItem(RETURN_KEY, String(parsedReturn));
      setSaved(true);
      setTimeout(() => navigate('/history'), 800);
    } catch (e) { setError(`Failed to save game: ${e instanceof Error ? e.message : String(e)}`); setSaving(false); }
  };

  if (loadingGame) return <div className="record page-mount"><p>Loading…</p></div>;
  if (gameNotFound) return <div className="record page-mount"><h1 className="page-title">Edit Game</h1><div className="error-box">Game not found.</div><div className="action-row"><button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button></div></div>;
  if (saved) return <div className="record page-mount"><div className="success-state"><p>{isEdit ? 'Game updated successfully!' : 'Game saved successfully!'}</p><span className="success-hint">Redirecting to history…</span></div></div>;

  return (
    <div className="record page-mount">
      <h1 className="page-title">{isEdit ? 'Edit Game' : 'Record New Game'}</h1>
      <div className="uma-info card" aria-labelledby="settings-title">
        <div className="scoring-settings-heading" id="settings-title">Scoring settings</div>
        <p className="scoring-settings-hint">Saved for this game and used as your next defaults.</p>
        <div className="scoring-fields">
          <div className="uma-field-group"><span className="uma-label">Uma, 1st → 4th</span><div className="uma-inputs">{uma.map((value, i) => <label className="compact-field" key={i}><span>{i + 1}P</span><input className="input uma-input" type="number" value={value} onChange={(e) => setUma((prev) => prev.map((v, n) => n === i ? Number(e.target.value || 0) : v))} /></label>)}</div></div>
          <label className="uma-field-group return-field"><span className="uma-label">Return score</span><input className="input" type="number" value={returnScore} onChange={(e) => setReturnScore(e.target.value)} /></label>
        </div>
      </div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="player-form" aria-describedby="player-order-hint">
        <p className="player-order-hint" id="player-order-hint">Enter the four players in any order. Final places are calculated from their scores.</p>
        {players.map((p, i) => <div className="form-row" key={i}>
          <span className="row-label player-number">{i + 1}P</span>
          <div className="row-fields">
            <label className="field-label"><span>Player {i + 1} name</span><input className="input" placeholder="Name" value={p.name} onChange={(e) => updatePlayer(i, 'name', e.target.value)} list={`suggest-${i}`} aria-invalid={Boolean(fieldErrors[`name-${i}`])} aria-describedby={fieldErrors[`name-${i}`] ? `name-error-${i}` : undefined} />{fieldErrors[`name-${i}`] && <span className="field-error" id={`name-error-${i}`}>{fieldErrors[`name-${i}`]}</span>}</label>
            <datalist id={`suggest-${i}`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
            <label className="field-label score-field-label"><span>Score</span><input className="input score-input" placeholder="100000" type="number" value={p.score} onChange={(e) => updatePlayer(i, 'score', e.target.value)} aria-invalid={Boolean(fieldErrors[`score-${i}`])} aria-describedby={fieldErrors[`score-${i}`] ? `score-error-${i}` : undefined} />{fieldErrors[`score-${i}`] && <span className="field-error" id={`score-error-${i}`}>{fieldErrors[`score-${i}`]}</span>}</label>
            <label className="chombo-toggle"><input type="checkbox" checked={p.chombo} onChange={(e) => updatePlayer(i, 'chombo', e.target.checked)} /><span className="chombo-label">Chombo</span></label>
          </div>
        </div>)}
        <div className={`score-total ${difference === 0 ? 'score-total-valid' : ''}`} aria-live="polite"><span>Total entered <strong>{total.toLocaleString()}</strong></span><span>{difference === 0 ? 'Ready to save' : `${Math.abs(difference).toLocaleString()} ${difference > 0 ? 'over' : 'remaining'}`}</span></div>
      </div>
      <div className="action-row"><button className="btn btn-secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{isEdit ? (saving ? 'Saving…' : 'Save Changes') : saving ? 'Saving…' : 'Save'}</button></div>
    </div>
  );
}
