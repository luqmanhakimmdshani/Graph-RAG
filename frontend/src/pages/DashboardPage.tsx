import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Layers3, Network, RotateCcw, Users } from "lucide-react";
import { apiGet } from "../lib/api";
import { BarList, GroupedBars, PartBar } from "../components/charts";

interface EvalGroup {
  n: number;
  graph_relevance: number;
  generic_relevance: number;
}

interface Overview {
  corpus: { articles: number; sources: { name: string; count: number }[]; first_date: string; last_date: string; days: number } | null;
  chunks: number | null;
  graph: {
    entities: number;
    entities_by_type: Record<string, number>;
    relationships: number;
    relationships_by_type: { type: string; count: number }[];
    top_entities: { name: string; type: string; connections: number }[];
    topics: number;
  } | null;
  eval: Record<string, EvalGroup> | null;
  errors: string[];
}

// Plain-language names - the dashboard is for people who haven't read the code.
const REL_LABEL: Record<string, string> = {
  EMPLOYED_BY: "works at",
  FOUNDED: "founded",
  COMPETES_WITH: "competes with",
  PARTNERED_WITH: "partnered with",
  INVESTED_IN: "invested in",
  ACQUIRED: "acquired",
};
const TYPE = {
  PERSON: { label: "People", color: "var(--chart-person)" },
  ORG: { label: "Organisations", color: "var(--chart-org)" },
  PRODUCT: { label: "Products", color: "var(--chart-product)" },
} as const;
const EVAL_GROUPS: [string, string][] = [
  ["local", "Simple facts"],
  ["multi_hop", "Connected facts"],
  ["global", "Big-picture questions"],
];
const SOURCES_SHOWN = 6;

const fmt = (n: number) => n.toLocaleString("en-US");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  function load() {
    setFailed(false);
    setData(null);
    apiGet<Overview>("/stats/overview")
      .then(setData)
      .catch(() => setFailed(true));
  }
  useEffect(load, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="label mb-2">Dashboard</div>
        <h1 className="text-2xl font-semibold tracking-tight">At a glance</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
          {data?.corpus
            ? `What the system learned from ${fmt(data.corpus.articles)} news articles published ${fmtDate(data.corpus.first_date)} – ${fmtDate(data.corpus.last_date)}, and how well it answers questions about them.`
            : "What the system learned from the news articles, and how well it answers questions about them."}
        </p>
      </header>

      {failed ? (
        <div className="card flex items-center justify-between gap-4 p-5" role="alert">
          <p className="text-sm text-[var(--danger)]">Couldn't load the statistics. The server may not be running.</p>
          <button
            onClick={load}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <Dashboard data={data} />
      )}
    </div>
  );
}

function Dashboard({ data }: { data: Overview }) {
  const { corpus, graph, eval: ev } = data;
  const overall = ev?.overall;

  return (
    <div className="space-y-4">
      {data.errors.length > 0 && (
        <p className="text-sm text-[var(--danger)]" role="status">
          Some figures couldn't be loaded ({data.errors.join(", ")}) and are hidden below.
        </p>
      )}

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={FileText} value={corpus?.articles} label="news articles" sub={corpus && `from ${corpus.sources.length} outlets`} />
        <Stat icon={Users} value={graph?.entities} label="names found" sub="people, organisations & products" />
        <Stat icon={Network} value={graph?.relationships} label="connections" sub="between those names" />
        <Stat icon={Layers3} value={graph?.topics} label="topics" sub="groups of related names" />
      </section>

      {ev && overall && (
        <Card
          title="How well it answers"
          aside={
            <Link to="/eval" className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
              Full results <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <p className="mb-5 text-sm leading-6 text-[var(--text-muted)]">
            {overall.n} test questions, each answered twice and scored 0–5 for how well the answer matches the right
            one. Following the connections scores{" "}
            <span className="font-semibold text-[var(--text)]">{overall.graph_relevance.toFixed(2)}</span> against{" "}
            <span className="font-semibold text-[var(--text)]">{overall.generic_relevance.toFixed(2)}</span> for plain
            text search.
          </p>
          <GroupedBars
            max={5}
            a={{ name: "Graph RAG (follows connections)", color: "var(--chart-graph)" }}
            b={{ name: "Plain text search", color: "var(--chart-generic)" }}
            groups={EVAL_GROUPS.filter(([k]) => ev[k]).map(([k, label]) => ({
              label,
              a: ev[k].graph_relevance,
              b: ev[k].generic_relevance,
            }))}
          />
        </Card>
      )}

      {graph && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="What it found">
            <PartBar
              parts={(Object.keys(TYPE) as (keyof typeof TYPE)[]).map((t) => ({
                label: TYPE[t].label,
                value: graph.entities_by_type[t] ?? 0,
                color: TYPE[t].color,
              }))}
            />
            <h3 className="mb-2 mt-6 text-sm font-medium">Kinds of connection</h3>
            <BarList
              items={graph.relationships_by_type.map((r) => ({
                label: REL_LABEL[r.type] ?? r.type.toLowerCase(),
                value: r.count,
                hint: `${Math.round((r.count / graph.relationships) * 100)}%`,
              }))}
            />
          </Card>

          <Card title="Most connected">
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              The names with the most links to others, coloured by type as above.
            </p>
            <BarList
              items={graph.top_entities.map((e) => ({
                label: e.name,
                value: e.connections,
                color: TYPE[e.type as keyof typeof TYPE]?.color,
                hint: `${TYPE[e.type as keyof typeof TYPE]?.label.replace(/s$/, "") ?? e.type}`,
              }))}
            />
          </Card>
        </div>
      )}

      {corpus && (
        <Card title="Where the news comes from">
          <BarList
            items={[
              ...corpus.sources.slice(0, SOURCES_SHOWN).map((s) => ({
                label: s.name,
                value: s.count,
                hint: `${Math.round((s.count / corpus.articles) * 100)}%`,
              })),
              ...(corpus.sources.length > SOURCES_SHOWN
                ? [
                    {
                      label: `${corpus.sources.length - SOURCES_SHOWN} other outlets`,
                      value: corpus.sources.slice(SOURCES_SHOWN).reduce((s, x) => s + x.count, 0),
                      color: "color-mix(in srgb, var(--chart-neutral) 50%, transparent)",
                    },
                  ]
                : []),
            ]}
          />
          <p className="mt-4 text-xs text-[var(--text-faint)]">
            {corpus.days} days of coverage{data.chunks ? ` · split into ${fmt(data.chunks)} passages for searching` : ""}
          </p>
        </Card>
      )}
    </div>
  );
}

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  sub,
}: {
  icon: typeof FileText;
  value: number | undefined | null;
  label: string;
  sub?: string | null;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <Icon className="mb-3 h-4 w-4 text-[var(--accent)]" aria-hidden />
      <div className="mono text-3xl font-semibold tabular-nums tracking-[-0.02em]">{value == null ? "—" : fmt(value)}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
      {sub && <div className="mt-0.5 text-xs leading-5 text-[var(--text-faint)]">{sub}</div>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse" aria-busy="true" aria-label="Loading statistics">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-32" />
        ))}
      </div>
      <div className="card h-72" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-80" />
        <div className="card h-80" />
      </div>
    </div>
  );
}
