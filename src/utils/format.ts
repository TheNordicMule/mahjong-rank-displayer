export function formatDate(ts: number): string {
  const d = new Date(ts);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
}

export function formatSigned(n: number): string {
  // Round to 1 decimal for display robustness — points are always multiples
  // of 0.1, and cumulative sums can otherwise drift (e.g. 0.1 + 0.2).
  const r = Math.round(n * 10) / 10;
  if (r > 0) return `+${r}`;
  if (r < 0) return `${r}`;
  return '0';
}
