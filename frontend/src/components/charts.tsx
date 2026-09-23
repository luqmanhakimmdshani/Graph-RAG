import { useEffect, useState } from "react";

// Hand-built bar charts (no chart library: these are bars, labels and a hover
// state). Mark specs follow the dataviz skill: thin bars square at the
// baseline with a 4px rounded data end, 2px surface gaps between stacked
// segments, values printed as text so identity is never colour-alone, series
// colours from the validated --chart-* tokens, text in text tokens only.

const GROW = "transform 700ms cubic-bezier(0.23, 1, 0.32, 1)"; // critically damped feel, no overshoot

/** False on the first frame, then true - bars mount at 0 and grow to value.
 * transform-only, so it stays on the compositor; the global reduced-motion
 * rule in index.css collapses the transition to an instant jump. */
function useGrown() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return grown;
}

const fmt = (n: number) => n.toLocaleString("en-US");

// Hover/focus highlight, pure Tailwind - no React state. The list dims every
// row while the pointer is anywhere over it (or focus is inside it), and the
// row under the pointer stays full strength. Rows touch (padding, not gaps),
// so moving between them never passes through an "un-hovered" moment - that
// gap was what made the JS version flash. hover: only fires on real pointers
// in Tailwind v4, so touch screens don't get a stuck dim.
const LIST = "group/list";
const ROW =
  "group/row rounded-md outline-none transition-opacity duration-200 " +
  "group-hover/list:opacity-40 group-focus-within/list:opacity-40 hover:opacity-100 focus-visible:opacity-100 " +
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)]";
// Extra detail fades in over space that's always reserved, so nothing moves.
const REVEAL = "opacity-0 transition-opacity duration-200 group-hover/row:opacity-100 group-focus-visible/row:opacity-100";

export interface BarItem {
  label: string;
  value: number;
  color?: string;
  /** Shown on hover/focus - the context the bare number lacks. */
  hint?: string;
}

/** Ranked horizontal bars, one series. Hover or focus a row to dim the rest
 * and reveal its hint. */
export function BarList({ items, color = "var(--chart-neutral)" }: { items: BarItem[]; color?: string }) {
  const grown = useGrown();
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className={LIST}>
      {items.map((item, i) => (
        <li
          key={item.label}
          tabIndex={0}
          className={`${ROW} grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 px-2 py-2 sm:grid-cols-[minmax(0,11rem)_1fr_auto]`}
        >
          <span className="truncate text-sm text-[var(--text-muted)]" title={item.label}>
            {item.label}
          </span>
          <span className="relative h-2">
            <span
              className="absolute inset-y-0 left-0 w-full origin-left rounded-r-[4px]"
              style={{
                background: item.color ?? color,
                transform: `scaleX(${grown ? item.value / max : 0})`,
                transition: GROW,
                transitionDelay: `${i * 40}ms`,
              }}
            />
          </span>
          <span className="flex items-baseline justify-end gap-2">
            {item.hint && <span className={`${REVEAL} text-xs text-[var(--text-faint)]`}>{item.hint}</span>}
            <span className="mono min-w-10 text-right text-sm tabular-nums text-[var(--text)]">{fmt(item.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface Part {
  label: string;
  value: number;
  color: string;
}

/** One stacked 100% bar for a part-to-whole split, with a direct-labelled
 * legend (name, count, share) underneath. */
export function PartBar({ parts }: { parts: Part[] }) {
  const grown = useGrown();
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;

  return (
    <div>
      <div
        className="flex h-3 origin-left gap-[2px] overflow-hidden rounded-[4px]"
        style={{ transform: `scaleX(${grown ? 1 : 0})`, transition: GROW }}
        role="img"
        aria-label={parts.map((p) => `${p.label} ${fmt(p.value)}`).join(", ")}
      >
        {parts.map((p) => (
          <span key={p.label} style={{ flexGrow: p.value, background: p.color }} title={`${p.label}: ${fmt(p.value)}`} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <li key={p.label}>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
              {p.label}
            </div>
            <div className="mono mt-1 text-lg font-semibold tabular-nums tracking-tight">{fmt(p.value)}</div>
            <div className="text-xs tabular-nums text-[var(--text-faint)]">{Math.round((p.value / total) * 100)}%</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface Series {
  name: string;
  color: string;
}

/** Two series compared across groups on one shared 0-max axis (never two
 * axes). Every bar carries its value as text; hovering a group adds the gap. */
export function GroupedBars({
  groups,
  a,
  b,
  max,
}: {
  groups: { label: string; a: number; b: number }[];
  a: Series;
  b: Series;
  max: number;
}) {
  const grown = useGrown();
  const ticks = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
        {[a, b].map((s) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="relative">
        {/* Recessive grid: faint lines at each whole score, labels on the axis only. */}
        <div className="pointer-events-none absolute inset-y-0 left-[9rem] right-12 sm:left-[11rem]" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute inset-y-0 border-l border-[var(--border)]"
              style={{ left: `${(t / max) * 100}%` }}
            />
          ))}
        </div>
        <ul className={`relative ${LIST}`}>
          {groups.map((g, i) => (
            <li
              key={g.label}
              tabIndex={0}
              className={`${ROW} grid grid-cols-[9rem_1fr] items-center py-1.5 sm:grid-cols-[11rem_1fr]`}
            >
              <span className="pr-3 text-sm leading-5 text-[var(--text-muted)]">
                {g.label}
                <span className={`${REVEAL} block text-xs text-[var(--text-faint)]`}>
                  {(g.a - g.b).toFixed(2)} points {g.a >= g.b ? "higher" : "lower"}
                </span>
              </span>
              <span className="space-y-1.5 py-1">
                {[
                  [g.a, a],
                  [g.b, b],
                ].map(([value, s], j) => (
                  <span key={j} className="grid grid-cols-[1fr_3rem] items-center">
                    <span className="relative h-2.5">
                      <span
                        className="absolute inset-y-0 left-0 w-full origin-left rounded-r-[4px]"
                        style={{
                          background: (s as Series).color,
                          transform: `scaleX(${grown ? (value as number) / max : 0})`,
                          transition: GROW,
                          transitionDelay: `${i * 60 + j * 30}ms`,
                        }}
                      />
                    </span>
                    <span className="mono text-right text-xs tabular-nums text-[var(--text)]">
                      <span className="sr-only">{(s as Series).name}: </span>
                      {(value as number).toFixed(2)}
                    </span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 grid grid-cols-[9rem_1fr] sm:grid-cols-[11rem_1fr]" aria-hidden>
        <span />
        <span className="relative mr-12 h-4 text-[10px] tabular-nums text-[var(--text-faint)]">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
