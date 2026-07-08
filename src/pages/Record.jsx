import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as storage from '../utils/storage';
import { RETURN_SCORE } from '../utils/scoring';
import './Record.css';

const EMPTY_PLAYERS = [
  { name: '', score: '', chombo: false },
  { name: '', score: '', chombo: false },
  { name: '', score: '', chombo: false },
  { name: '', score: '', chombo: false }
];

export default function Record() {
  const [players, setPlayers] = useState(EMPTY_PLAYERS.map(p => ({ ...p })));
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    storage.getPlayers().then(setSuggestions).catch(() => {});
  }, []);

  // Refill most recent names on mount
  useEffect(() => {
    storage.getLatestNames().then(names => {
      if (names && names.length > 0) {
        setPlayers(prev => prev.map((p, i) => ({
          ...p,
          name: names[i] ?? p.name
        })));
      }
    }).catch(() => {});
  }, []);

  const updatePlayer = (index, field, value) => {
    const updated = players.map((p, i) =>
      i === index ? { ...p, [field]: value } : { ...p }
    );
    setPlayers(updated);
    setError('');
  };

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < players.length; i++) {
      if (!players[i].name.trim()) {
        setError(`Please enter a name for player ${i + 1}`);
        return;
      }
      if (players[i].score === '' || isNaN(Number(players[i].score))) {
        setError(`Please enter a valid score for player ${i + 1}`);
        return;
      }
    }

    const names = players.map(p => p.name.trim());
    const nameSet = new Set(names);
    if (nameSet.size !== names.length) {
      setError('Player names must be unique');
      return;
    }

    const totalScore = players.reduce((sum, p) => sum + Number(p.score), 0);
    if (totalScore !== 100000) {
      setError(`Total score must be 100,000 (currently ${totalScore.toLocaleString()})`);
      return;
    }

    const data = players.map(p => ({
      name: p.name.trim(),
      rawScore: Number(p.score),
      chombo: p.chombo
    }));

    setSaving(true);
    try {
      await storage.addGame(data);
      setSaved(true);
      setTimeout(() => {
        navigate('/history');
      }, 800);
    } catch (e) {
      setError(`Failed to save game: ${e.message}`);
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (saved) {
    return (
      <div className="record page-mount">
        <div className="success-state">
          <p>Game saved successfully!</p>
          <span className="success-hint">Redirecting to history…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="record page-mount">
      <h1 className="page-title">Record New Game</h1>

      <div className="uma-info card">
        <span className="uma-label">Uma</span>
        <span className="uma-values">30 / 10 / -10 / -30</span>
        <span className="uma-divider" />
        <span className="uma-label">Return</span>
        <span className="uma-values">{RETURN_SCORE}</span>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="player-form">
        {players.map((p, i) => (
          <div className="form-row" key={i}>
            <span className={`row-label rank-${i + 1}`}>{i + 1}P</span>
            <div className="row-fields">
              <input
                className="input"
                placeholder="Player name"
                value={p.name}
                onChange={e => updatePlayer(i, 'name', e.target.value)}
                list={`suggest-${i}`}
              />
              <datalist id={`suggest-${i}`}>
                {suggestions.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <input
                className="input score-input"
                placeholder="Score"
                type="number"
                value={p.score}
                onChange={e => updatePlayer(i, 'score', e.target.value)}
              />
              <label className="chombo-toggle">
                <input
                  type="checkbox"
                  checked={p.chombo}
                  onChange={e => updatePlayer(i, 'chombo', e.target.checked)}
                />
                <span className="chombo-label">Chombo</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="action-row">
        <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
