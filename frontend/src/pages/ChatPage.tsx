import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, ChevronDown, ChevronUp, FileText, Layers3, Network, RotateCcw, SquarePen } from "lucide-react";
import { apiPost } from "../lib/api";
import SubgraphView from "../components/SubgraphView";

interface Citation {
  article_id: string;
  title: string;
  source: string;
  url: string;
}

interface CommunityCitation {
  community_id: number;
  size: number;
  summary: string;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface QueryResponse {
  answer: string;
  citations: Citation[] | CommunityCitation[];
  subgraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  mode?: "graph" | "global" | "error";
  error?: string;
}

interface Turn {
  id: number;
  question: string;
  status: "loading" | "done" | "error";
  result?: QueryResponse;
}

// Known-good questions (each checked against the live graph), one of each
// kind: a direct fact, two multi-hop ones, and a big-picture question that
// takes the topic-summary path. Hardcoded rather than fetched so the empty
// state never depends on the network during a demo.
const SUGGESTIONS = [
  "Which AI research lab did Google acquire?",
  "Which two companies invested in Anthropic?",
  "Besides OpenAI, what else did Sam Altman found?",
  "What trends are visible in India's tech startup scene?",
];

const SOURCES_PREVIEW = 4;

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.status === "loading");

  // Bring each new question (and later its answer) into view - instant under
  // reduced motion, smooth otherwise.
  const lastTurn = turns[turns.length - 1];
  useEffect(() => {
    if (!lastTurn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastTurnRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [lastTurn?.id, lastTurn?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(id: number, q: string) {
    let next: Pick<Turn, "status" | "result">;
    try {
      const res = await apiPost<QueryResponse>("/query", { question: q });
      next = res.error ? { status: "error" } : { status: "done", result: res };
    } catch {
      next = { status: "error" };
    }
    setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...next } : t)));
  }

  function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    const id = nextId.current++;
    setTurns((ts) => [...ts, { id, question: text, status: "loading" }]);
    setQuestion("");
    run(id, text);
  }

  function retry(turn: Turn) {
    if (busy) return;
    setTurns((ts) => ts.map((t) => (t.id === turn.id ? { ...t, status: "loading", result: undefined } : t)));
    run(turn.id, turn.question);
  }

  function newChat() {
    setTurns([]);
    setQuestion("");
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6.5rem)] max-w-2xl flex-col px-6 pt-10 lg:min-h-dvh">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="label mb-2">Chat</div>
          <h1 className="text-2xl font-semibold tracking-tight">Ask about the news</h1>
          <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
            Ask about the people, companies and products in 500 news articles from November 2023. Every answer
            shows its sources and how it was found.
          </p>
        </div>
        {turns.length > 0 && (
          <button
            onClick={newChat}
            disabled={busy}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <SquarePen className="h-4 w-4" /> New chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-8 pb-8">
        {turns.length === 0 && (
          <div>
            <p className="mb-3 text-sm text-[var(--text-muted)]">Not sure where to start? Try one of these:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="card card-hover group flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-left text-sm leading-5 text-[var(--text-muted)]"
                >
                  {s}
                  {/* Fades in on hover: "click to ask this". */}
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={turn.id} ref={i === turns.length - 1 ? lastTurnRef : undefined} className="scroll-mt-6 space-y-3">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--accent-soft)] px-4 py-2.5 text-[15px] leading-6">
                {turn.question}
              </p>
            </div>
            {turn.status === "loading" && <Thinking />}
            {turn.status === "error" && <TurnError onRetry={() => retry(turn)} disabled={busy} />}
            {turn.status === "done" && turn.result && <Answer result={turn.result} />}
          </div>
        ))}
      </div>

      {/* Composer stays reachable at the bottom however long the thread gets. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="sticky bottom-0 pb-6 pt-2"
      >
        <label htmlFor="chat-question" className="sr-only">
          Your question
        </label>
        {/* Solid surface, not the translucent glass other cards use: the thread
            scrolls underneath, and answer text showing through looked broken. */}
        <div
          className="card flex items-center gap-2 p-2"
          style={{ background: "var(--surface)", boxShadow: "0 -8px 32px rgba(0,0,0,0.35)" }}
        >
          <input
            id="chat-question"
            ref={inputRef}
            autoFocus
            className="min-h-11 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-[var(--text-faint)]"
            placeholder="Ask a question about the news…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            aria-label="Ask"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Thinking() {
  // One status region, worded for people: an answer takes a few seconds and a
  // bare spinner leaves that wait unexplained.
  return (
    <div className="card p-5" role="status">
      <p className="mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Network className="h-4 w-4 text-[var(--accent)] motion-safe:animate-pulse" />
        Following the connections between people and companies… this takes a few seconds.
      </p>
      <div className="space-y-2.5 motion-safe:animate-pulse" aria-hidden>
        <div className="h-3 w-11/12 rounded bg-[var(--surface-hover)]" />
        <div className="h-3 w-4/5 rounded bg-[var(--surface-hover)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--surface-hover)]" />
      </div>
    </div>
  );
}

function TurnError({ onRetry, disabled }: { onRetry: () => void; disabled: boolean }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-4" role="alert">
      <p className="text-sm text-[var(--danger)]">Couldn't get an answer just now. The service may be busy.</p>
      <button
        onClick={onRetry}
        disabled={disabled}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-40"
      >
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}

function Answer({ result }: { result: QueryResponse }) {
  const [showGraph, setShowGraph] = useState(false);
  const [allSources, setAllSources] = useState(false);
  const isTopics = result.mode === "global";
  const hasGraph = result.subgraph.nodes.length > 0;
  const sources = allSources ? result.citations : result.citations.slice(0, SOURCES_PREVIEW);
  const hidden = result.citations.length - SOURCES_PREVIEW;

  return (
    <div className="card p-5">
      <div
        className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium"
        style={{ color: "var(--accent)" }}
      >
        {isTopics ? <Layers3 className="h-3.5 w-3.5" /> : <Network className="h-3.5 w-3.5" />}
        {isTopics ? "Answered from topic summaries" : "Answered from connected facts"}
      </div>

      <p className="whitespace-pre-wrap text-[15px] leading-7">{result.answer}</p>

      {hasGraph && (
        <>
          <button
            onClick={() => setShowGraph((s) => !s)}
            aria-expanded={showGraph}
            className="mt-4 flex min-h-11 items-center gap-1.5 text-sm font-medium text-[var(--accent)]"
          >
            {showGraph ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showGraph ? "Hide" : "Show"} how this answer was found
          </button>
          {showGraph && (
            <div className="card mt-2 p-4">
              <SubgraphView nodes={result.subgraph.nodes} edges={result.subgraph.edges} />
            </div>
          )}
        </>
      )}

      {/* Big-picture answers are given every topic summary, not a relevant
          subset, so listing them would show the largest topics rather than the
          ones this answer drew on - state what was used instead. */}
      {isTopics && result.citations.length > 0 && (
        <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)]">
          Based on summaries of all {result.citations.length} topics found across the news articles.
        </p>
      )}

      {!isTopics && result.citations.length > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="label mb-2.5">Sources ({result.citations.length})</div>
          <div className="space-y-1">
            {(sources as Citation[]).map((c) => (
              <a
                key={c.article_id}
                href={c.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-2 rounded-md px-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              >
                <FileText className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
                <span className="truncate">{c.title}</span>
                {c.source && <span className="ml-auto shrink-0 text-xs text-[var(--text-faint)]">{c.source}</span>}
              </a>
            ))}
          </div>
          {hidden > 0 && (
            <button
              onClick={() => setAllSources((s) => !s)}
              className="mt-1 min-h-11 px-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {allSources ? "Show fewer" : `Show ${hidden} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
