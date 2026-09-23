import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Database,
  GitBranch,
  GitCompare,
  Layers3,
  MessageSquare,
  Network,
  UploadCloud,
} from "lucide-react";
import { apiGet } from "../lib/api";
import CodeGraphHero from "../components/CodeGraphHero";

interface GraphStats {
  entities: number | null;
  relationships: number | null;
  communities: number | null;
}

const STEPS = [
  { n: "01", title: "Ingest & chunk", body: "News articles are chunked and embedded into a vector store." },
  { n: "02", title: "Extract", body: "An LLM pulls entities and relationships out of every chunk." },
  { n: "03", title: "Traverse", body: "A question walks the graph outward from the entities it names." },
  { n: "04", title: "Answer", body: "The model answers from graph facts, citing sources and the path used." },
];

const FEATURES = [
  { to: "/chat", icon: MessageSquare, title: "Chat", body: "Ask a question, get an answer grounded in the graph." },
  { to: "/compare", icon: GitCompare, title: "Compare", body: "The same question through generic RAG and Graph RAG, side by side." },
  { to: "/explorer", icon: Network, title: "Explorer", body: "Fly through the knowledge graph in 3D and expand any node." },
  { to: "/eval", icon: BarChart3, title: "Evaluation", body: "20 benchmark questions, scored for relevance and faithfulness." },
];

function StatReadout({ label, value, icon: Icon }: { label: string; value: number | null; icon: typeof Database }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-[var(--text-faint)]" />
      <span className="mono text-xl font-semibold tracking-tight">{value ?? "—"}</span>
      <span className="text-xs text-[var(--text-faint)]">{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState<GraphStats | null>(null);

  useEffect(() => {
    apiGet<GraphStats>("/graph/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <header className="scrim-header sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] px-5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Network className="h-3.5 w-3.5" strokeWidth={2.25} />
          </div>
          <span className="text-sm font-semibold">Graph RAG</span>
          <span className="mono text-[10px] text-[var(--text-faint)]">capstone</span>
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 py-1.5 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Open app <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Hero - the 3D visual IS graphify's own reading of this repo's code graph */}
      <section className="relative h-[600px] select-none overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0">
          <CodeGraphHero />
        </div>
        {/* pointer-events-none all the way down except the two links themselves -
            the graph underneath should be draggable from anywhere, including
            over the headline, not just the empty margins around this column. */}
        <div className="pointer-events-none relative mx-auto flex h-full max-w-6xl flex-col justify-center px-6 lg:px-10">
          {/* No gradient behind this column anymore (the graph's glow reads better
              unobscured), so legibility against whatever bright nodes happen to
              settle behind the text this load comes from a text-shadow instead -
              inherited by every child below rather than repeated per element. */}
          <div className="max-w-xl" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.75)" }}>
            <div className="label mb-3">Knowledge-graph-augmented RAG</div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight lg:text-5xl">
              Ask questions your vector database can't answer.
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-[var(--text-muted)]">
              A knowledge graph built from a real news corpus — LLM entity extraction, multi-hop graph traversal,
              and community summarization, benchmarked head-to-head against generic vector RAG.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/chat"
                className="pointer-events-auto flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
              >
                Open Chat <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/compare"
                className="pointer-events-auto flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                Generic vs Graph RAG
              </Link>
            </div>
          </div>
        </div>
        <p className="mono pointer-events-none absolute bottom-4 right-5 text-[10px] text-[var(--text-faint)]">
          this repo's own code graph, via graphify — drag to orbit · scroll to zoom
        </p>
      </section>

      {/* Live stats - pulled from the running graph, not fabricated */}
      <section className="border-b border-[var(--border)] px-6 py-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-3">
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 6px #10b981" }} />
            live from the graph
          </span>
          <StatReadout label="entities" value={stats?.entities ?? null} icon={Layers3} />
          <StatReadout label="relationships" value={stats?.relationships ?? null} icon={GitBranch} />
          <StatReadout label="communities" value={stats?.communities ?? null} icon={Database} />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="label mb-2">Pipeline</div>
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="mono text-sm text-[var(--accent)]">{s.n}</div>
                <div className="mt-2 text-sm font-semibold">{s.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)] px-6 py-16 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="label mb-2">Explore</div>
          <h2 className="text-2xl font-semibold tracking-tight">Four ways to look at the same graph</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Link key={f.to} to={f.to} className="card group p-5 transition-transform hover:-translate-y-0.5">
                <f.icon className="h-5 w-5 text-[var(--accent)]" />
                <div className="mt-4 text-sm font-semibold">{f.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">{f.body}</p>
                <div className="mt-4 flex items-center text-xs font-medium text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="mono text-[11px] text-[var(--text-faint)]">
            Graph RAG Capstone — Neo4j · ChromaDB · Gemini
          </span>
          <Link to="/admin" className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            <UploadCloud className="h-3.5 w-3.5" /> Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
