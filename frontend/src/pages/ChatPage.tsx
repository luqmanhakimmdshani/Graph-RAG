import { useState } from "react";
import { FileText, Send, Sparkles } from "lucide-react";
import { apiPost } from "../lib/api";

interface Citation {
  article_id: string;
  title: string;
  source: string;
  url: string;
}

interface QueryResponse {
  answer: string;
  citations: Citation[];
}

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiPost<QueryResponse>("/query/generic", { question });
      setResult(res);
    } catch {
      setError("Query failed — is the backend running and has the corpus been ingested?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <div className="label mb-2">Baseline</div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Generic vector-RAG. See <span className="text-[var(--text)]">Compare</span> for Graph RAG side by side.
        </p>
      </div>

      <form onSubmit={ask} className="card flex items-center gap-2 p-2">
        <input
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-faint)]"
          placeholder="e.g. Which companies did Sam Altman work at before founding OpenAI?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-9 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-40"
        >
          {loading ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
          {loading ? "Asking" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {result && (
        <div className="card mt-4 p-5">
          <p className="whitespace-pre-wrap text-[15px] leading-7">{result.answer}</p>
          {result.citations.length > 0 && (
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <div className="label mb-2.5">Sources</div>
              <div className="space-y-1.5">
                {result.citations.map((c) => (
                  <a
                    key={c.article_id}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-faint)]" />
                    <span className="truncate">{c.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-[var(--text-faint)]">{c.source}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
