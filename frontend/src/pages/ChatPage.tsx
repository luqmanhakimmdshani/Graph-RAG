import { useState } from "react";
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
      const res = await apiPost<QueryResponse>("/query/vanilla", { question });
      setResult(res);
    } catch {
      setError("Query failed — is the backend running and has the corpus been ingested?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Chat</h1>
      <p className="text-gray-500 text-sm mb-4">
        Vanilla vector-RAG baseline (Phase 1). Graph RAG lands in Phase 3.
      </p>

      <form onSubmit={ask} className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="e.g. Which companies did Sam Altman work at before founding OpenAI?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <div>
          <p className="whitespace-pre-wrap mb-4">{result.answer}</p>
          {result.citations.length > 0 && (
            <div className="border-t pt-3">
              <h2 className="text-sm font-semibold text-gray-500 mb-2">Sources</h2>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                {result.citations.map((c) => (
                  <li key={c.article_id}>
                    <a href={c.url} target="_blank" rel="noreferrer" className="underline">
                      {c.title}
                    </a>{" "}
                    <span className="text-gray-500">— {c.source}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
