import { useEffect, useState } from "react";
import { Database, GitBranch, Layers3, UploadCloud } from "lucide-react";
import { apiGet, apiUpload } from "../lib/api";

interface IngestStatus {
  chunks_indexed: number;
  graph: { entities: number | null; relationships: number | null; communities: number | null };
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Database }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">{label}</span>
        <Icon className="h-3.5 w-3.5 text-[var(--text-faint)]" />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const [status, setStatus] = useState<IngestStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState("");

  function refresh() {
    apiGet<IngestStatus>("/ingest/status").then(setStatus).catch(() => {});
  }

  useEffect(refresh, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setResult("");
    try {
      const res = await apiUpload<{
        articles: number;
        chunks: number;
        entities_extracted: number;
        extraction_failures: number;
      }>("/ingest", files);
      setResult(
        `Ingested ${res.articles} article(s) -> ${res.chunks} chunk(s), ` +
          `${res.entities_extracted} entities extracted` +
          (res.extraction_failures ? ` (${res.extraction_failures} chunk(s) failed extraction)` : "")
      );
      refresh();
    } catch {
      setResult("Upload failed — is the backend running?");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <div className="label mb-2">Batch ingestion</div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          Upload .txt or .json (title/body/date/source) articles to chunk, embed, and extract into the knowledge
          graph.
        </p>
      </div>

      <label className="card mb-6 flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center transition-colors hover:bg-[var(--surface-hover)]">
        <input type="file" multiple accept=".txt,.json" className="hidden" onChange={onUpload} disabled={uploading} />
        <UploadCloud className="h-5 w-5 text-[var(--text-faint)]" />
        <span className="text-sm text-[var(--text-muted)]">{uploading ? "Uploading…" : "Click to select files"}</span>
      </label>

      {result && <p className="mb-6 text-sm text-[var(--text-muted)]">{result}</p>}

      <div className="label mb-3">Corpus stats</div>
      {status ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Chunks" value={status.chunks_indexed} icon={Database} />
          <StatCard label="Entities" value={status.graph.entities ?? "—"} icon={Layers3} />
          <StatCard label="Relationships" value={status.graph.relationships ?? "—"} icon={GitBranch} />
          <StatCard label="Communities" value={status.graph.communities ?? "—"} icon={Layers3} />
        </div>
      ) : (
        <p className="text-sm text-[var(--text-faint)]">Loading…</p>
      )}
    </div>
  );
}
