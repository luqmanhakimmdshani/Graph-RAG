import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Database,
  GitBranch,
  GitCompare,
  Info,
  Layers3,
  MessageSquare,
  Network,
  UploadCloud,
} from "lucide-react";
import { apiGet } from "../lib/api";
import BackendStatus from "../components/BackendStatus";
import CodeGraphHero from "../components/CodeGraphHero";
import ThemeToggle from "../components/ThemeToggle";
import { useReadOnly } from "../lib/readOnly";
import type { Theme } from "../lib/theme";

interface GraphStats {
  entities: number | null;
  relationships: number | null;
  communities: number | null;
}

// The demo route, in order. Admin and Eval are for the builder, not the audience.
const HEADER_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/chat", label: "Chat" },
  { to: "/compare", label: "Compare" },
  { to: "/graph-tree", label: "Graph tree" },
];

const STEPS = [
  { n: "01", title: "Ingest & chunk", body: "News articles are chunked and embedded into a vector store." },
  { n: "02", title: "Extract", body: "An LLM pulls entities and relationships out of every chunk." },
  { n: "03", title: "Traverse", body: "A question walks the graph outward from the entities it names." },
  { n: "04", title: "Answer", body: "The model answers from graph facts, citing sources and the path used." },
];

const FEATURES = [
  { to: "/chat", icon: MessageSquare, title: "Chat", body: "Ask a question, get an answer grounded in the graph." },
  { to: "/compare", icon: GitCompare, title: "Compare", body: "The same question through generic RAG and Graph RAG, side by side." },
  { to: "/graph-tree", icon: Network, title: "Graph tree", body: "Fly through the knowledge graph in 3D and expand any node." },
  { to: "/eval", icon: BarChart3, title: "Evaluation", body: "20 benchmark questions, scored for relevance and faithfulness." },
];
// The read-only public demo hides Evaluation, so About fills its slot.
const ABOUT_FEATURE = { to: "/about", icon: Info, title: "About", body: "What Graph RAG is, how it works, and who built it." };

function StatReadout({ label, value, icon: Icon }: { label: string; value: number | null; icon: typeof Database }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-[var(--text-faint)]" />
      <span className="mono text-xl font-semibold tracking-tight">{value ?? "—"}</span>
      <span className="text-xs text-[var(--text-faint)]">{label}</span>
    </div>
  );
}

export default function LandingPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const readOnly = useReadOnly();
  const features = readOnly === false ? FEATURES : FEATURES.map((f) => (f.to === "/eval" ? ABOUT_FEATURE : f));
  // The hero logo matches the headline's height, which changes whenever it
  // re-wraps (viewport width, font load) - so observe it.
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [headlineHeight, setHeadlineHeight] = useState(0);

  useEffect(() => {
    apiGet<GraphStats>("/graph/stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadlineHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      {/* Three columns - brand | links | status - so the links sit at the true
          centre of the bar whatever the widths of the two sides. */}
      <header className="scrim-header sticky top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--border)] px-5 lg:px-8">
        {/* Full reload, so the graph hero replays its intro. */}
        <Link
          to="/"
          reloadDocument
          aria-label="Graph RAG home"
          className="flex min-h-11 items-center gap-2.5 justify-self-start rounded-md"
        >
          <img src="/logo.svg" alt="" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold">Graph RAG</span>
          <span className="mono text-[10px] text-[var(--text-faint)]">capstone</span>
        </Link>
        {/* Plain text links, no container or fill: grey, brightening on hover.
            Keyboard focus still gets a visible ring. Hidden on phones, where
            the header keeps logo + status. */}
        <nav aria-label="App sections" className="hidden items-center gap-12 sm:flex">
          {HEADER_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex h-9 items-center rounded-sm text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="col-start-3 flex items-center gap-2 justify-self-end">
          <BackendStatus pill />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      {/* Hero - the 3D visual IS graphify's own reading of this repo's code graph */}
      <section className="relative select-none overflow-hidden border-b border-[var(--border)] sm:h-[600px]">
        <div className="absolute inset-0">
          <CodeGraphHero />
        </div>
        {/* pointer-events-none all the way down except the two links themselves -
            the graph underneath should be draggable from anywhere, including
            over the headline, not just the empty margins around this column. */}
        <div className="pointer-events-none relative mx-auto flex max-w-6xl flex-col justify-center px-6 pb-14 pt-10 sm:h-full sm:py-0 lg:px-10">
          {/* No gradient behind this column anymore (the graph's glow reads better
              unobscured), so legibility against whatever bright nodes happen to
              settle behind it comes from a shadow instead: text-shadow on the
              wording (inherited from the grid), and the same shadow as a
              drop-shadow filter on the logo, which has no background tile here. */}
          {/* Two-column grid: the logo sits in column 1 on the headline's row only;
              label, headline, paragraph and buttons all share column 2, so they
              line up with the headline rather than with the logo. */}
          <div
            className="grid grid-cols-1 justify-start gap-x-6 sm:grid-cols-[auto_minmax(0,36rem)] lg:gap-x-8"
            style={{ textShadow: "var(--hero-text-shadow)" }}
          >
            <div className="label mb-3 sm:col-start-2">Knowledge-graph-augmented RAG</div>
            {/* Height is measured from the headline (see headlineHeight) - CSS
                can't size an image from a sibling: aspect-ratio + stretch gave a
                0-wide logo, and a bare stretched SVG img blew up instead.
                logo-mark.svg is cropped to the network with no padding, so the
                mark fills exactly the headline's height. */}
            <img
              src="/logo-mark.svg"
              alt="Graph RAG logo"
              className="self-center max-sm:order-first max-sm:mb-6 max-sm:!h-16 max-sm:justify-self-start sm:col-start-1 sm:row-start-2"
              style={{
                height: headlineHeight ? `${headlineHeight}px` : "6rem",
                aspectRatio: "468 / 432",
                filter: "var(--hero-logo-filter)",
              }}
            />
            <h1
              ref={headlineRef}
              className="text-balance text-[2.1rem] font-semibold leading-[1.08] tracking-tight sm:col-start-2 sm:row-start-2 sm:text-4xl lg:text-5xl"
            >
              Multi-vector retrieval across a knowledge graph.
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-[var(--text-muted)] sm:col-start-2">
              A knowledge graph built from a real news corpus — LLM entity extraction, multi-hop graph traversal, and
              community summarization, benchmarked head-to-head against generic vector RAG.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:col-start-2" style={{ textShadow: "none" }}>
              <Link
                to="/chat"
                className="pointer-events-auto flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
              >
                Open Chat <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/compare"
                className="pointer-events-auto flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                See the difference
              </Link>
            </div>
          </div>
        </div>
        <p className="mono pointer-events-none absolute inset-x-0 bottom-4 text-center text-[10px] text-[var(--text-faint)] sm:hidden">
          drag the graph to rotate · pinch to zoom
        </p>
        <p className="mono pointer-events-none absolute bottom-4 right-5 hidden text-[10px] text-[var(--text-faint)] sm:block">
          this repo's own code graph, via graphify — drag to orbit · scroll to zoom
        </p>
      </section>

      {/* Live stats - pulled from the running graph, not fabricated */}
      <section className="border-b border-[var(--border)] px-6 py-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-10 gap-y-3">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--text-faint)]">
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
            {features.map((f) => (
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
          {readOnly === false && (
            <Link to="/admin" className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
              <UploadCloud className="h-3.5 w-3.5" /> Add articles
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
