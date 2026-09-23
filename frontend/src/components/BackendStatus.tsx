import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

type Status = "checking" | "ok" | "down";

// Plain words for the landing page's audience; the app shell keeps its
// terse developer-style readout.
const PILL_LABEL: Record<Status, string> = { checking: "connecting", ok: "live", down: "offline" };

/** One /health check on mount. `pill` = the landing header's outlined badge. */
export default function BackendStatus({ pill = false }: { pill?: boolean }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    apiGet<{ status: string }>("/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("down"));
  }, []);

  const color = status === "ok" ? "bg-emerald-500" : status === "down" ? "bg-[var(--danger)]" : "bg-[var(--text-faint)]";
  const dot = (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${color}`}
      style={status === "ok" ? { boxShadow: "0 0 6px #10b981" } : undefined}
      aria-hidden
    />
  );

  if (pill) {
    return (
      <span
        className="flex h-9 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs text-[var(--text-muted)]"
        title={status === "ok" ? "The server is running" : status === "down" ? "The server isn't reachable" : "Checking the server"}
      >
        {dot}
        {PILL_LABEL[status]}
      </span>
    );
  }
  return (
    <span className="mono flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
      {dot}
      backend:{status}
    </span>
  );
}
