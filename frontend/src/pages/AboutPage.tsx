import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  GitCompare,
  GraduationCap,
  Landmark,
  MessageSquare,
  Network,
} from "lucide-react";
import { apiGet } from "../lib/api";
import { useReadOnly } from "../lib/readOnly";
import CodeGraphHero from "../components/CodeGraphHero";
import codeGraph from "../data/codeGraph.json";

interface Overview {
  corpus: { articles: number; days: number } | null;
  graph: { entities: number; relationships: number; topics: number } | null;
  eval: Record<string, { n: number; graph_relevance: number; generic_relevance: number }> | null;
}

const fmt = (n: number) => n.toLocaleString("en-US");

const STEPS = [
  ["Read", "Each article is split into short passages."],
  ["Extract", "AI models list the people, companies and products, and how they connect."],
  ["Follow", "A question starts at the names it mentions and walks the links between them."],
  ["Answer", "The AI writes the answer from those facts, and cites the article behind each one."],
];

const STACK = [
  ["Interface", "React · Vite · Tailwind"],
  ["API", "FastAPI · Python"],
  ["Knowledge graph", "Neo4j AuraDB"],
  ["Passage search", "ChromaDB · sentence-transformers"],
  ["Language models", "Any OpenAI-compatible provider, Gemini or local Ollama"],
];

const TRY = [
  {
    to: "/chat",
    icon: MessageSquare,
    title: "Chat",
    text: "Ask a question and see which connections the answer came from.",
  },
  {
    to: "/compare",
    icon: GitCompare,
    title: "Compare",
    text: "The same question answered by plain RAG and Graph RAG, side by side.",
  },
  { to: "/explorer", icon: Network, title: "Explorer", text: "Fly through the map of names and links in 3D." },
];

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="reveal">
      <div className="label mb-3">{label}</div>
      <h2 className="mb-8 max-w-3xl text-balance text-[clamp(1.6rem,3.2vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.02em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CreatorCard() {
  const rows = [
    { icon: Briefcase, text: "AI Engineer @ Pepper Labs" },
    { icon: GraduationCap, text: "Bachelor of Computer Science in Artificial Intelligence" },
    { icon: Landmark, text: "Universiti Malaya" },
  ];
  return (
    <div className="card p-6">
      <div className="label mb-4">Built by</div>
      <div className="mb-5 flex items-center gap-4">
        <div
          aria-hidden
          className="mono flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent)]"
        >
          LH
        </div>
        <div className="text-lg font-semibold leading-snug tracking-tight">Luqman Hakim Bin Md Shani</div>
      </div>
      <ul className="space-y-3">
        {rows.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
            <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2} aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums">
        {value}
      </div>
      <div className="mt-2 text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function ScoreBar({ name, score, color }: { name: string; score: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-[var(--text-muted)]">{name}</span>
        <span className="mono tabular-nums">{score.toFixed(2)} / 5</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--surface-hover)]">
        <div className="h-full rounded-full" style={{ width: `${(score / 5) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AboutPage() {
  const [data, setData] = useState<Overview | null>(null);
  const readOnly = useReadOnly();
  useEffect(() => {
    apiGet<Overview>("/stats/overview")
      .then(setData)
      .catch(() => {});
  }, []);
  const overall = data?.eval?.overall;
  const ratio = overall && overall.generic_relevance > 0 ? overall.graph_relevance / overall.generic_relevance : null;

  return (
    <div>
      {/* Hero - the moving graph is graphify's map of this project's own code.
          Overlay is pointer-events-none so the graph can be dragged from anywhere. */}
      <section className="relative flex select-none flex-col overflow-hidden border-b border-[var(--border)] sm:block sm:min-h-[620px]">
        <div className="relative order-last h-[22rem] border-t border-[var(--border)] sm:absolute sm:inset-0 sm:order-none sm:h-auto sm:border-t-0">
          <CodeGraphHero />
          <p className="mono pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] text-[var(--text-faint)] sm:hidden">
            drag to rotate · pinch to zoom
          </p>
        </div>
        <div className="pointer-events-none relative mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-14 sm:min-h-[620px] lg:grid-cols-[1fr_22rem]">
          <div style={{ textShadow: "var(--hero-text-shadow)" }}>
            <div className="mb-6 flex items-center gap-3">
              <img
                src="/logo.svg"
                alt=""
                className="h-10 w-10 rounded-xl"
                style={{ boxShadow: "0 0 24px rgba(255,255,255,0.12)" }}
              />
              <span className="label">Capstone project</span>
            </div>
            <h1 className="text-balance text-[clamp(2.4rem,5.5vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              Answers that follow <span className="text-[var(--accent)]">the connections</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-7 text-[var(--text-muted)]">
              Graphical RAG: a graph-vector approach to enterprise knowledge retrieval. It reads the news, maps who is
              connected to whom, and answers questions by walking that map, with a source for every fact.
            </p>
          </div>
          <CreatorCard />
        </div>
        <p className="mono pointer-events-none absolute bottom-4 right-6 hidden text-[11px] text-[var(--text-faint)] sm:block">
          Behind: this project's own code, mapped by graphify · {codeGraph.nodes.length} parts, {codeGraph.links.length}{" "}
          links · drag to rotate
        </p>
      </section>

      <div className="mx-auto max-w-5xl space-y-28 px-6 pb-24 pt-24">
        <Section label="What is RAG?" title="An AI that looks things up before it answers">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <div className="label mb-3">An AI on its own</div>
              <p className="text-lg leading-7">Like a closed-book exam: it answers from memory alone.</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                It hasn't read your documents, and can confidently make things up.
              </p>
            </div>
            <div className="card p-6" style={{ borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)" }}>
              <div className="label mb-3" style={{ color: "var(--accent)" }}>
                An AI with RAG
              </div>
              <p className="text-lg leading-7">Like an open-book exam: it finds the right pages first, then answers.</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                Answers come from your documents, with sources you can check.
              </p>
            </div>
          </div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Retrieval", "find the relevant text"],
              ["Augmented", "add it to the question"],
              ["Generation", "the AI writes the answer from it"],
            ].map(([word, meaning]) => (
              <li key={word} className="text-sm leading-6 text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--accent)]">{word}</span>: {meaning}
              </li>
            ))}
          </ol>
        </Section>

        <Section label="The improvement" title="Normal RAG matches words. Graph RAG follows connections.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card flex gap-4 p-6">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-muted)]" strokeWidth={2} aria-hidden />
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Normal RAG</span> hands the AI the 5 passages that
                sound most like the question. If the answer is split across articles, it never sees the whole picture.
              </p>
            </div>
            <div className="card flex gap-4 p-6">
              <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={2} aria-hidden />
              <p className="text-sm leading-6 text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Graph RAG</span> builds a map of who is connected to
                whom, then starts at the names in the question and walks the links, joining facts from different
                articles.
              </p>
            </div>
          </div>
          <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <div className="mono mb-3 text-xs text-[var(--accent)]">0{i + 1}</div>
                <div className="mb-1.5 font-semibold">{title}</div>
                <p className="text-sm leading-6 text-[var(--text-muted)]">{text}</p>
              </li>
            ))}
          </ol>
        </Section>

        {data?.graph && (
          <Section label="By the numbers" title="Two weeks of news, mapped">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {data.corpus && <Stat value={fmt(data.corpus.articles)} label="news articles" />}
              <Stat value={fmt(data.graph.entities)} label="people, companies and products" />
              <Stat value={fmt(data.graph.relationships)} label="connections between them" />
              <Stat value={fmt(data.graph.topics)} label="topic groups" />
            </div>
          </Section>
        )}

        {overall && ratio && (
          <Section label="Results" title={`${ratio.toFixed(1)}× as relevant when the system follows connections`}>
            <div className="card space-y-5 p-6">
              <ScoreBar
                name="Graph RAG (follows connections)"
                score={overall.graph_relevance}
                color="var(--chart-graph)"
              />
              <ScoreBar
                name="Normal RAG (plain text search)"
                score={overall.generic_relevance}
                color="var(--chart-generic)"
              />
              <p className="text-xs leading-5 text-[var(--text-faint)]">
                Average relevance over {overall.n} test questions, each answered both ways and scored by an AI judge.{" "}
                {readOnly === false && (
                  <Link to="/eval" className="underline underline-offset-2 hover:text-[var(--text)]">
                    See every question
                  </Link>
                )}
              </p>
            </div>
          </Section>
        )}

        <Section label="Built with" title="Open, swappable parts">
          <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {STACK.map(([role, tools]) => (
              <div key={role} className="border-t border-[var(--border)] pt-4">
                <dt className="label mb-1.5">{role}</dt>
                <dd className="text-sm leading-6">{tools}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section label="Try it" title="See it for yourself">
          <div className="grid gap-4 md:grid-cols-3">
            {TRY.map(({ to, icon: Icon, title, text }) => (
              <Link key={to} to={to} className="card card-hover group flex flex-col p-6">
                <Icon className="mb-4 h-5 w-5 text-[var(--accent)]" strokeWidth={2} aria-hidden />
                <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
                  {title}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <p className="text-sm leading-6 text-[var(--text-muted)]">{text}</p>
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
