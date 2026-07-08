import { useEffect, useMemo, useState } from 'react';
import type { Placement } from '../types';
import './PlacementPie.css';

const RANKS = [1, 2, 3, 4];

const CX = 100;
const CY = 100;
const OUTER_R = 80;
const INNER_R = 52;

function polar(cx: number, cy: number, r: number, angleRad: number): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleRad: number,
  sweepRad: number,
): string {
  if (sweepRad >= Math.PI * 2 - 0.001) {
    const outerTop = polar(cx, cy, outerR, startAngleRad);
    const outerBottom = polar(cx, cy, outerR, startAngleRad + Math.PI);
    const innerTop = polar(cx, cy, innerR, startAngleRad);
    const innerBottom = polar(cx, cy, innerR, startAngleRad + Math.PI);

    return (
      `M ${outerTop.x.toFixed(2)} ${outerTop.y.toFixed(2)} ` +
      `A ${outerR} ${outerR} 0 1 1 ${outerBottom.x.toFixed(2)} ${outerBottom.y.toFixed(2)} ` +
      `A ${outerR} ${outerR} 0 1 1 ${outerTop.x.toFixed(2)} ${outerTop.y.toFixed(2)} ` +
      `L ${innerTop.x.toFixed(2)} ${innerTop.y.toFixed(2)} ` +
      `A ${innerR} ${innerR} 0 1 0 ${innerBottom.x.toFixed(2)} ${innerBottom.y.toFixed(2)} ` +
      `A ${innerR} ${innerR} 0 1 0 ${innerTop.x.toFixed(2)} ${innerTop.y.toFixed(2)} Z`
    );
  }

  const endAngleRad = startAngleRad + sweepRad;
  const largeArc = sweepRad > Math.PI ? 1 : 0;

  const outerStart = polar(cx, cy, outerR, startAngleRad);
  const outerEnd = polar(cx, cy, outerR, endAngleRad);
  const innerStart = polar(cx, cy, innerR, startAngleRad);
  const innerEnd = polar(cx, cy, innerR, endAngleRad);

  return (
    `M ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} ` +
    `L ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)} ` +
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)} ` +
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)} ` +
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} Z`
  );
}

interface PlacementPieProps {
  placement: Placement;
  totalGames: number;
}

export default function PlacementPie({ placement, totalGames }: PlacementPieProps) {
  const [drawn, setDrawn] = useState<boolean>(false);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [placement, totalGames]);

  const hasData = totalGames > 0 && RANKS.some((r) => (placement[r] ?? 0) > 0);

  const slices = useMemo(() => {
    if (!hasData) return [];

    let currentAngle = -Math.PI / 2;
    return RANKS.map((rank) => {
      const pct = placement[rank] ?? 0;
      const sweep = (pct / 100) * Math.PI * 2;
      const path =
        pct > 0 ? describeDonutSlice(CX, CY, INNER_R, OUTER_R, currentAngle, sweep) : null;
      currentAngle += sweep;
      return { rank, pct, path };
    }).filter((s): s is { rank: number; pct: number; path: string } => s.path !== null);
  }, [placement, hasData]);

  if (!hasData) {
    return (
      <div className="placement-pie">
        <div className="placement-pie-empty">No games yet</div>
      </div>
    );
  }

  return (
    <div className={`placement-pie ${drawn ? 'drawn' : ''}`}>
      <div className="placement-pie-content">
        <div className="placement-pie-chart">
          <svg
            viewBox="0 0 200 200"
            className="placement-pie-svg"
            role="img"
            aria-label="Placement distribution donut chart"
          >
            <defs>
              <linearGradient id="pieGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f9d98c" />
                <stop offset="100%" stopColor="var(--gold)" />
              </linearGradient>
              <linearGradient id="pieSilver" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dfe1e5" />
                <stop offset="100%" stopColor="var(--silver)" />
              </linearGradient>
              <linearGradient id="pieBronze" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e4ac82" />
                <stop offset="100%" stopColor="var(--bronze)" />
              </linearGradient>
              <linearGradient id="pieRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f08080" />
                <stop offset="100%" stopColor="var(--red-rank)" />
              </linearGradient>
            </defs>

            {slices.map((slice, index) => (
              <path
                key={slice.rank}
                d={slice.path}
                className={`placement-pie-slice placement-pie-slice-${slice.rank}`}
                style={{ transitionDelay: `${index * 90}ms` }}
              />
            ))}

            <text x={CX} y={CY - 6} textAnchor="middle" className="placement-pie-total">
              {totalGames.toLocaleString()}
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" className="placement-pie-total-label">
              games
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
