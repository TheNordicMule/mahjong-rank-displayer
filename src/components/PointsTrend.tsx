import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrendPoint } from '../types';
import { formatDate, formatSigned } from '../utils/format';
import './PointsTrend.css';

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 220;
const PADDING_LEFT = 58;
const PADDING_RIGHT = 18;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 42;

interface ChartPoint {
  x: number;
  y: number;
  points: number;
  cumulative: number;
  timestamp: number;
  barTopY: number;
  barBottomY: number;
}

interface ChartData {
  points: ChartPoint[];
  linePath: string;
  areaPath: string;
  lineLength: number;
  min: number;
  max: number;
  zeroY: number | null;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
  chartWidth: number;
  chartHeight: number;
  peakIndices: number[];
  troughIndices: number[];
}

interface PointsTrendProps {
  trend: TrendPoint[];
}

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

export default function PointsTrend({ trend }: PointsTrendProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!trend || trend.length < 2) return;
    setDrawn(false);
    setHoveredIndex(null);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [trend]);

  const chart = useMemo<ChartData>(() => {
    const empty: ChartData = {
      points: [],
      linePath: '',
      areaPath: '',
      lineLength: 0,
      min: 0,
      max: 0,
      zeroY: null,
      chartLeft: 0,
      chartRight: 0,
      chartTop: 0,
      chartBottom: 0,
      chartWidth: 0,
      chartHeight: 0,
      peakIndices: [],
      troughIndices: [],
    };
    if (!trend || trend.length < 2) return empty;

    const cumulativeValues = trend.map((d) => d.cumulative);
    // Cumulative value BEFORE this game — for the first game this is 0,
    // for subsequent games it's the previous cumulative point.
    const beforeValues = trend.map((d) => d.cumulative - d.points);

    let minVal = Math.min(...cumulativeValues, ...beforeValues);
    let maxVal = Math.max(...cumulativeValues, ...beforeValues);

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

    const xFor = (i: number): number => chartLeft + (i / (count - 1)) * chartWidth;
    const yFor = (v: number): number =>
      chartBottom - ((v - minVal) / (maxVal - minVal)) * chartHeight;

    const points: ChartPoint[] = trend.map((d, i) => {
      const cy = yFor(d.cumulative);
      // Anchor the bar at the cumulative value BEFORE this game so the bar
      // visually represents the per-game swing from "before" to "after".
      const baseY = yFor(d.cumulative - d.points);
      return {
        x: xFor(i),
        y: cy,
        points: d.points,
        cumulative: d.cumulative,
        timestamp: d.timestamp,
        barTopY: Math.min(cy, baseY),
        barBottomY: Math.max(cy, baseY),
      };
    });

    const lineD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const areaD =
      `M ${points[0].x.toFixed(1)} ${chartBottom.toFixed(1)} ` +
      lineD.replace(/^M/, 'L') +
      ` L ${points[points.length - 1].x.toFixed(1)} ${chartBottom.toFixed(1)} Z`;

    let lineLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      lineLength += Math.sqrt(dx * dx + dy * dy);
    }

    const minCumulative = Math.min(...cumulativeValues);
    const maxCumulative = Math.max(...cumulativeValues);
    const peakIndices: number[] = [];
    const troughIndices: number[] = [];
    if (minCumulative !== maxCumulative) {
      cumulativeValues.forEach((v, i) => {
        if (v === maxCumulative) peakIndices.push(i);
        if (v === minCumulative) troughIndices.push(i);
      });
    }

    return {
      points,
      linePath: lineD,
      areaPath: areaD,
      lineLength,
      min: minCumulative,
      max: maxCumulative,
      zeroY: 0 >= minVal && 0 <= maxVal ? yFor(0) : null,
      chartLeft,
      chartRight,
      chartTop,
      chartBottom,
      chartWidth,
      chartHeight,
      peakIndices,
      troughIndices,
    };
  }, [trend]);

  const nearestIndexFromEvent = (clientX: number): number | null => {
    const svg = svgRef.current;
    if (!svg || !chart.points.length) return null;
    const svgRect = svg.getBoundingClientRect();
    const scaleX = VIEWBOX_WIDTH / svgRect.width;
    const svgX = (clientX - svgRect.left) * scaleX;
    const clampedX = Math.max(chart.chartLeft, Math.min(chart.chartRight, svgX));
    const ratio = (clampedX - chart.chartLeft) / chart.chartWidth;
    return Math.round(ratio * (chart.points.length - 1));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const index = nearestIndexFromEvent(e.clientX);
    if (index !== null) setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const index = nearestIndexFromEvent(e.clientX);
    if (index !== null) {
      setHoveredIndex((prev) => (prev === index ? null : index));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (chart.points.length === 0) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredIndex((prev) => {
        if (prev === null) return e.key === 'ArrowLeft' ? chart.points.length - 1 : 0;
        const delta = e.key === 'ArrowLeft' ? -1 : 1;
        const next = prev + delta;
        return Math.max(0, Math.min(chart.points.length - 1, next));
      });
    } else if (e.key === 'Escape') {
      setHoveredIndex(null);
    }
  };

  const tooltipPosition = useMemo(() => {
    if (hoveredIndex === null || !containerRef.current || !svgRef.current) return null;
    const point = chart.points[hoveredIndex];
    const containerRect = containerRef.current.getBoundingClientRect();
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = svgRect.width / VIEWBOX_WIDTH;
    const scaleY = svgRect.height / VIEWBOX_HEIGHT;
    const pointX = svgRect.left - containerRect.left + point.x * scaleX;
    const pointY = svgRect.top - containerRect.top + point.y * scaleY;

    const tooltipWidth = 180;
    let left = pointX - tooltipWidth / 2;
    left = Math.max(8, Math.min(containerRect.width - tooltipWidth - 8, left));
    const top = pointY - 12;

    return { left, top };
  }, [hoveredIndex, chart.points]);

  const hoveredPoint = hoveredIndex !== null ? chart.points[hoveredIndex] : null;
  const showDots = chart.points.length <= 40;
  const count = chart.points.length;
  const barGap = count > 1 ? chart.chartWidth / (count - 1) : chart.chartWidth;
  const barWidth = Math.min(barGap * 0.72, 32);

  if (!trend || trend.length < 2) {
    return (
      <div className="points-trend">
        <h3 className="section-title">Points Trend</h3>
        <div className="points-trend-empty">
          <svg
            className="points-trend-empty-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M3.5 18.5l5-5 3 3 6.5-7 3 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fillOpacity="0.1"
            />
          </svg>
          <p>Not enough games for a trend</p>
        </div>
      </div>
    );
  }

  return (
    <div className="points-trend">
      <h3 className="section-title">Points Trend</h3>
      <div
        className="chart-container"
        ref={containerRef}
        tabIndex={0}
        role="img"
        aria-label={`Points trend across ${count} games, with cumulative points ranging from ${chart.min.toLocaleString()} to ${chart.max.toLocaleString()}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={() => setHoveredIndex((prev) => (prev === null ? count - 1 : prev))}
        onBlur={handleMouseLeave}
      >
        <svg ref={svgRef} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="chart-svg">
          <defs>
            <linearGradient id="pointsTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                style={{ stopColor: 'var(--accent)', stopOpacity: 0.26 } as React.CSSProperties}
              />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--accent)', stopOpacity: 0 } as React.CSSProperties}
              />
            </linearGradient>
          </defs>

          <line
            x1={chart.chartLeft}
            y1={chart.chartTop}
            x2={chart.chartRight}
            y2={chart.chartTop}
            className="chart-grid"
          />
          <line
            x1={chart.chartLeft}
            y1={chart.chartBottom}
            x2={chart.chartRight}
            y2={chart.chartBottom}
            className="chart-grid"
          />

          {chart.zeroY !== null && (
            <line
              x1={chart.chartLeft}
              y1={chart.zeroY}
              x2={chart.chartRight}
              y2={chart.zeroY}
              className="chart-baseline"
            />
          )}

          <path d={chart.areaPath} className="chart-area" fill="url(#pointsTrendArea)" />

          {chart.points.map((p, i) => (
            <rect
              key={`bar-${i}`}
              x={p.x - barWidth / 2}
              y={p.barTopY}
              width={barWidth}
              height={Math.max(0.5, p.barBottomY - p.barTopY)}
              rx={Math.min(2, barWidth / 4)}
              className={`chart-bar ${p.points >= 0 ? 'chart-bar-positive' : 'chart-bar-negative'} ${
                hoveredIndex === i ? 'chart-bar-active' : ''
              }`}
              style={{ animationDelay: `${i * 12}ms` }}
            />
          ))}

          <path
            d={chart.linePath}
            className="chart-line"
            fill="none"
            style={{
              strokeDasharray: chart.lineLength,
              strokeDashoffset: drawn ? 0 : chart.lineLength,
            }}
          />

          {showDots &&
            chart.points.map((p, i) => (
              <circle
                key={`dot-${i}`}
                cx={p.x}
                cy={p.y}
                r="2.5"
                className={`chart-dot ${hoveredIndex === i ? 'chart-dot-hidden' : ''}`}
                style={{ animationDelay: `${0.35 + i * 0.02}s` }}
              />
            ))}

          {chart.peakIndices.map((i) => (
            <g key={`peak-${i}`} className="chart-marker chart-marker-peak">
              <circle cx={chart.points[i].x} cy={chart.points[i].y} r="5" />
              <circle cx={chart.points[i].x} cy={chart.points[i].y} r="9" />
            </g>
          ))}
          {chart.troughIndices.map((i) => (
            <g key={`trough-${i}`} className="chart-marker chart-marker-trough">
              <circle cx={chart.points[i].x} cy={chart.points[i].y} r="5" />
              <circle cx={chart.points[i].x} cy={chart.points[i].y} r="9" />
            </g>
          ))}

          <text
            x={chart.chartLeft - 10}
            y={chart.chartTop + 10}
            className="chart-label chart-label-y"
          >
            {chart.max.toLocaleString()}
          </text>
          <text
            x={chart.chartLeft - 10}
            y={chart.chartBottom - 4}
            className="chart-label chart-label-y"
          >
            {chart.min.toLocaleString()}
          </text>
          {chart.zeroY !== null && (
            <text
              x={chart.chartLeft - 10}
              y={chart.zeroY - 5}
              className="chart-label chart-label-zero"
            >
              0
            </text>
          )}

          <text
            x={chart.chartLeft}
            y={VIEWBOX_HEIGHT - 14}
            className="chart-axis-label chart-axis-label-start"
          >
            {formatShortDate(chart.points[0].timestamp)}
          </text>
          <text
            x={chart.chartLeft + chart.chartWidth / 2}
            y={VIEWBOX_HEIGHT - 14}
            className="chart-axis-label chart-axis-label-mid"
          >
            {formatShortDate(chart.points[Math.floor((chart.points.length - 1) / 2)].timestamp)}
          </text>
          <text
            x={chart.chartRight}
            y={VIEWBOX_HEIGHT - 14}
            className="chart-axis-label chart-axis-label-end"
          >
            {formatShortDate(chart.points[chart.points.length - 1].timestamp)}
          </text>

          {hoveredPoint && (
            <g className="chart-crosshair">
              <line
                x1={hoveredPoint.x}
                y1={chart.chartTop}
                x2={hoveredPoint.x}
                y2={chart.chartBottom}
              />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" />
            </g>
          )}
        </svg>

        {hoveredPoint && tooltipPosition && (
          <div
            className="chart-tooltip"
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            role="tooltip"
          >
            <div className="chart-tooltip-date">{formatDate(hoveredPoint.timestamp)}</div>
            <div className="chart-tooltip-game">
              Game {hoveredIndex !== null ? hoveredIndex + 1 : ''} of {count}
            </div>
            <div className="chart-tooltip-row">
              <span className="chart-tooltip-label">This game</span>
              <span
                className={`chart-tooltip-value ${
                  hoveredPoint.points >= 0 ? 'chart-tooltip-positive' : 'chart-tooltip-negative'
                }`}
              >
                {formatSigned(hoveredPoint.points)}
              </span>
            </div>
            <div className="chart-tooltip-row">
              <span className="chart-tooltip-label">Cumulative</span>
              <span className="chart-tooltip-value chart-tooltip-cumulative">
                {hoveredPoint.cumulative.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
