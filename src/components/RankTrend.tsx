import './RankTrend.css';

const RANK_COLORS: Record<number, string> = {
  1: 'badge-gold',
  2: 'badge-silver',
  3: 'badge-bronze',
  4: 'badge-red',
};

interface RankTrendProps {
  ranks: number[];
}

export default function RankTrend({ ranks }: RankTrendProps) {
  if (!ranks || ranks.length === 0) return null;

  return (
    <div className="rank-trend">
      {ranks.map((r, i) => (
        <div key={i} className={`rank-badge ${RANK_COLORS[r] || 'badge-default'}`}>
          {r}
        </div>
      ))}
    </div>
  );
}
