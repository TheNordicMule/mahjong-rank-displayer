import { useEffect, useMemo, useState } from 'react';
import './PointsTrend.css';

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 180;
const PADDING_LEFT = 48;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 30;

export default function PointsTrend({ trend }) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!trend || trend.length < 2) return;
    setDrawn(false);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [trend]);

  const chart = useMemo(() => {
    const empty = {
      linePath: '',
      areaPath: '',
      points: [],
      min: 0,
      max: 0,
      zeroY: null,
    };
    if (!trend || trend.length < 2) return empty;

    const values = trend.map(d => d.cumulative);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    const range = maxVal - minVal;
    minVal -= range * 0.08;
    maxVal += range * 0.08;

    const chartLeft = PADDING_LEFT;
    const chartRight = VIEWBOX_WIDTH - PADDING_RIGHT;
    const chartTop = PADDING_TOP;
    const chartBottom = VIEWBOX_HEIGHT - PADDING_BOTTOM;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;
    const count = trend.length;

    const xFor = (i) => chartLeft + (i / (count - 1)) * chartWidth;
    const yFor = (v) =>
      chartBottom - ((v - minVal) / (maxVal - minVal)) * chartHeight;

    const pts = trend.map((d, i) => ({
      x: xFor(i),
      y: yFor(d.cumulative),
    }));

    const lineD = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaD =
      `M ${pts[0].x.toFixed(1)} ${chartBottom.toFixed(1)} ` +
      lineD.replace(/^M/, 'L') +
      ` L ${pts[pts.length - 1].x.toFixed(1)} ${chartBottom.toFixed(1)} Z`;

    return {
      linePath: lineD,
      areaPath: areaD,
      points: pts,
      min: Math.min(...values),
      max: Math.max(...values),
      zeroY: 0 >= minVal && 0 <= maxVal ? yFor(0) : null,
    };
  }, [trend]);

  if (!trend || trend.length < 2) {
    return (
      <div className="points-trend">
        <h3 className="section-title">Points Trend</h3>
        <div className="points-trend-empty">Not enough games for a trend</div>
      </div>
    );
  }

  return (
    <div className="points-trend">
      <h3 className="section-title">Points Trend</h3>
      <div className="chart-container">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          className="chart-svg"
        >
          <defs>
            <linearGradient id="pointsTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {chart.zeroY !== null && (
            <line
              x1={PADDING_LEFT}
              y1={chart.zeroY}
              x2={VIEWBOX_WIDTH - PADDING_RIGHT}
              y2={chart.zeroY}
              className="chart-baseline"
            />
          )}

          <path d={chart.areaPath} className="chart-area" fill="url(#pointsTrendArea)" />

          <path
            d={chart.linePath}
            className={`chart-line ${drawn ? 'drawn' : ''}`}
            fill="none"
          />

          {chart.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3.5"
              className="chart-dot"
            />
          ))}

          <text x="8" y={PADDING_TOP + 10} className="chart-label chart-label-max">
            {chart.max.toLocaleString()}
          </text>
          <text x="8" y={VIEWBOX_HEIGHT - PADDING_BOTTOM - 4} className="chart-label chart-label-min">
            {chart.min.toLocaleString()}
          </text>
        </svg>
      </div>
    </div>
  );
}
