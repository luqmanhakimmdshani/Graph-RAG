import { useEffect, useState } from "react";
import { NavLink, Outlet, Route, Routes } from "react-router-dom";
import { BarChart3, GitCompare, MessageSquare, Network, UploadCloud } from "lucide-react";
import { apiGet } from "./lib/api";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import ComparePage from "./pages/ComparePage";
import EvalPage from "./pages/EvalPage";
import ExplorerPage from "./pages/ExplorerPage";
import LandingPage from "./pages/LandingPage";

const navItems = [
  { to: "/chat", label: "Chat", end: true, icon: MessageSquare },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/explorer", label: "Explorer", icon: Network },
  { to: "/admin", label: "Admin", icon: UploadCloud },
  { to: "/eval", label: "Eval", icon: BarChart3 },
];

function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    apiGet<{ status: string }>("/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("down"));
  }, []);

  const color = status === "ok" ? "bg-emerald-500" : status === "down" ? "bg-[var(--danger)]" : "bg-[var(--text-faint)]";
  return (
    <span className="mono flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} style={status === "ok" ? { boxShadow: "0 0 6px #10b981" } : undefined} />
      backend:{status}
    </span>
  );
}

function AppShell() {
  return (
    <div className="flex min-h-full">
      <aside className="glass-strong hidden lg:flex w-56 shrink-0 flex-col border-r px-3 py-5" style={{ borderColor: "var(--glass-border)" }}>
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]"
            style={{ boxShadow: "0 0 20px color-mix(in srgb, var(--accent) 45%, transparent)" }}
          >
            <Network className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Graph RAG</div>
            <div className="mono text-[10px] leading-tight tracking-wide text-[var(--text-faint)]">capstone</div>
          </div>
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--text)] font-medium"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className="h-4 w-4"
                    strokeWidth={2}
                    style={{ color: isActive ? "var(--accent)" : undefined }}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <BackendStatus />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="scrim-header sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] px-5 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
              <Network className="h-3.5 w-3.5" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold">Graph RAG</span>
          </div>
          <BackendStatus />
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
                  isActive ? "bg-[var(--accent-soft)] text-[var(--text)]" : "text-[var(--text-muted)]"
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppShell />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/eval" element={<EvalPage />} />
      </Route>
    </Routes>
  );
}
