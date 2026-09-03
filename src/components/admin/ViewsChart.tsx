/**
 * Daily page views. One series, so no legend and no categorical palette —
 * identity is carried by the axis, not by colour.
 *
 * The bar colour (#8a6b22, gold-deep) was validated at >= 3:1 against the
 * admin surface; the lighter brand gold failed that check, which is why it
 * is used only for the recessive baseline here. Every bar also carries an
 * accessible name with its exact value, and the same numbers are available
 * in the table below the chart, so nothing depends on reading the colour.
 */
export function ViewsChart({ daily }: { daily: { day: string; count: number }[] }) {
  if (daily.length === 0) {
    return (
      <p className="text-sm text-[#5a5e67]">
        No page views recorded yet. Counts appear here once the site is live and receiving visits.
      </p>
    );
  }

  const W = 720;
  const H = 180;
  const PAD_L = 8;
  const PAD_B = 22;
  const max = Math.max(...daily.map((d) => d.count), 1);
  const plotH = H - PAD_B;

  // 2px gap between adjacent bars, per the mark spec.
  const slot = (W - PAD_L * 2) / daily.length;
  const barW = Math.max(2, slot - 2);

  const peak = daily.reduce((a, b) => (b.count > a.count ? b : a), daily[0]);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Daily page views over the last ${daily.length} days. Peak of ${peak.count} on ${peak.day}.`}
      >
        {/* Recessive baseline */}
        <line x1={PAD_L} y1={plotH} x2={W - PAD_L} y2={plotH} stroke="#c8a24a" strokeWidth={1} opacity={0.5} />

        {daily.map((d, i) => {
          const h = Math.max(1, (d.count / max) * (plotH - 8));
          const x = PAD_L + i * slot;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={plotH - h}
                width={barW}
                height={h}
                rx={2}
                fill="#8a6b22"
              >
                <title>{`${d.day}: ${d.count} view${d.count === 1 ? "" : "s"}`}</title>
              </rect>
            </g>
          );
        })}

        {/* Selective direct labels: first, last and peak only — never a
            number on every bar. */}
        <text x={PAD_L} y={H - 6} fontSize={10} fill="#5a5e67">
          {daily[0].day}
        </text>
        {daily.length > 1 && (
          <text x={W - PAD_L} y={H - 6} fontSize={10} fill="#5a5e67" textAnchor="end">
            {daily[daily.length - 1].day}
          </text>
        )}
      </svg>
      <figcaption className="text-xs text-[#5a5e67] mt-1">
        Peak: {peak.count} view{peak.count === 1 ? "" : "s"} on {peak.day}. Hover a bar for its exact count.
      </figcaption>
    </figure>
  );
}

/**
 * Horizontal ranked bars. Again one series; each row is directly labelled
 * with its value, so the bar length is a visual aid rather than the only
 * way to read the number.
 */
export function RankedBars({
  rows,
  emptyLabel,
}: {
  rows: { label: string; count: number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-[#5a5e67]">{emptyLabel}</p>;

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="h-3 bg-[#c8a24a]/15 rounded-sm overflow-hidden">
            <span
              className="block h-full bg-[#8a6b22] rounded-sm"
              style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}
