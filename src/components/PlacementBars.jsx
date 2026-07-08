import './PlacementBars.css';

const RANK_LABELS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
const RANK_CLASSES = { 1: 'bar-gold', 2: 'bar-silver', 3: 'bar-bronze', 4: 'bar-red' };

export default function PlacementBars({ placement, totalGames }) {
  return (
    <div className="placement-bars">
      {[1, 2, 3, 4].map(r => {
        const pct = placement[r] ?? 0;
        const count = totalGames ? Math.round((pct / 100) * totalGames) : null;
        return (
          <div className="placement-row" key={r}>
            <span className="placement-label">{RANK_LABELS[r]}</span>
            <div className="placement-track">
              <div
                className={`placement-fill ${RANK_CLASSES[r]}`}
                style={{ '--pct': `${pct}%` }}
              />
            </div>
            <span className="placement-text">
              {count !== null ? (
                <>
                  <span className="placement-count">{count}</span>{' '}
                  <span className="placement-pct">({pct}%)</span>
                </>
              ) : (
                `${pct}%`
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
