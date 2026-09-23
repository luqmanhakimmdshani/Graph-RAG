import { useEffect, useState } from "react";
import { Database, GitBranch, Layers3, UploadCloud } from "lucide-react";
import { apiGet, apiUpload } from "../lib/api";

interface IngestResult {
  articles: number;
  chunks: number;
  entities_extracted: number;
  extraction_failures: number;
}

interface IngestStatus {
  chunks_indexed: number;
  graph: { entities: number | null; relationships: number | null; communities: number | null };
  ingesting: boolean;
  last_result: IngestResult | null;
  last_error: string | null;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Database }) {
  return (
    <div className="card p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="label">{label}</span>
        <Icon className="h-3.5 w-3.5 text-[var(--text-faint)]" />
      </div>
      <div className="mono text-2xl font-semibold tracking-tight">{value}</div>
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

  // /ingest now kicks the pipeline off as a background task and returns
  // immediately (extraction alone can take minutes on a real batch - awaiting
  // it inline risked a browser/proxy timeout). Poll /ingest/status instead,
  // which both drives the "still working" message and ticks the stat cards
  // up live as chunks/entities land, so a multi-minute run doesn't just look
  // frozen behind a static "Uploading…" label.
  async function pollUntilDone() {
    for (;;) {
      const s = await apiGet<IngestStatus>("/ingest/status").catch(() => null);
      if (!s) break;
      setStatus(s);
      if (!s.ingesting) {
        if (s.last_error) setResult(`Ingestion failed: ${s.last_error}`);
        else if (s.last_result) {
          const r = s.last_result;
          setResult(
            `Ingested ${r.articles} article(s) -> ${r.chunks} chunk(s), ` +
              `${r.entities_extracted} entities extracted` +
              (r.extraction_failures ? ` (${r.extraction_failures} chunk(s) failed extraction)` : "")
          );
        }
        break;
      }
      setResult("Processing in the background — this can take a while for a large batch…");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setResult("");
    try {
      await apiUpload<{ status: string; articles: number }>("/ingest", files);
      await pollUntilDone();
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
        <span className="text-sm text-[var(--text-muted)]">{uploading ? "Processing…" : "Click to select files"}</span>
      </label>

      {result && <p className="mb-6 text-sm text-[var(--text-muted)]">{result}</p>}

      <div className="label mb-3">Corpus stats</div>
      {status ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
