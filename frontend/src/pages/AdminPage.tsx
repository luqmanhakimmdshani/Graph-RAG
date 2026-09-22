import { useEffect, useState } from "react";
import { apiGet, apiUpload } from "../lib/api";

interface IngestStatus {
  chunks_indexed: number;
  graph: { entities: number | null; relationships: number | null; communities: number | null };
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
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Admin / Ingestion</h1>
      <p className="text-gray-500 text-sm mb-6">
        Upload .txt or .json (title/body/date/source) articles to chunk, embed, and extract
        into the knowledge graph.
      </p>

      <label className="block border-2 border-dashed rounded p-6 text-center cursor-pointer mb-6">
        <input type="file" multiple accept=".txt,.json" className="hidden" onChange={onUpload} disabled={uploading} />
        <span className="text-sm text-gray-600">{uploading ? "Uploading..." : "Click to select files"}</span>
      </label>

      {result && <p className="text-sm mb-6">{result}</p>}

      <div className="border-t pt-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">Corpus stats</h2>
        {status ? (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-gray-500">Chunks indexed</dt>
            <dd>{status.chunks_indexed}</dd>
            <dt className="text-gray-500">Entities</dt>
            <dd>{status.graph.entities ?? "Neo4j not configured"}</dd>
            <dt className="text-gray-500">Relationships</dt>
            <dd>{status.graph.relationships ?? "—"}</dd>
            <dt className="text-gray-500">Communities</dt>
            <dd>{status.graph.communities ?? "—"}</dd>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Loading...</p>
        )}
      </div>
    </div>
  );
}
