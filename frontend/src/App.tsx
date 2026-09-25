import { useEffect, useLayoutEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { BarChart3, GitCompare, Info, LayoutDashboard, MessageSquare, Network, UploadCloud, type LucideIcon } from "lucide-react";
import BackendStatus from "./components/BackendStatus";
import ErrorBoundary from "./components/ErrorBoundary";
import ThemeToggle from "./components/ThemeToggle";
import { apiGet } from "./lib/api";
import { useReadOnly } from "./lib/readOnly";
import { savedTheme, saveTheme, type Theme } from "./lib/theme";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import ComparePage from "./pages/ComparePage";
import DashboardPage from "./pages/DashboardPage";
import EvalPage from "./pages/EvalPage";
import ExplorerPage from "./pages/ExplorerPage";
import LandingPage from "./pages/LandingPage";

// Grouped by what each page is for, so the sidebar explains the app during a demo.
type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; reload?: boolean };
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Explore",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/graph-tree", label: "Graph tree", icon: Network },
    ],
  },
  {
    label: "Ask",
    items: [
      { to: "/chat", label: "Chat", end: true, icon: MessageSquare },
      { to: "/compare", label: "Compare", icon: GitCompare },
    ],
  },
  {
    label: "Build",
    items: [
      { to: "/admin", label: "Add articles", icon: UploadCloud },
      { to: "/eval", label: "Evaluation", icon: BarChart3 },
    ],
  },
  {
    label: "Project",
    // Full page load, so the page always opens with the graph hero's intro.
    items: [{ to: "/about", label: "About", icon: Info, reload: true }],
  },
];
// The public demo's backend is read-only, so its Build pages (uploads, eval
// runs) are hidden and redirected there; everything else is the same.
const BUILD_GROUP = "Build";

/** Live size of the graph: what every answer is drawn from. Hidden until it loads. */
function GraphStats() {
  const [stats, setStats] = useState<{ entities: number; relationships: number } | null>(null);
  useEffect(() => {
    apiGet<{ entities: number; relationships: number }>("/graph/stats").then(setStats).catch(() => {});
  }, []);
  if (!stats) return null;
  return (
    <div className="mono grid grid-cols-[auto_1fr] gap-x-2 text-[11px] leading-5 tabular-nums">
      <span className="text-right text-[var(--text-muted)]">{stats.entities.toLocaleString()}</span>
      <span className="text-[var(--text-faint)]">names</span>
      <span className="text-right text-[var(--text-muted)]">{stats.relationships.toLocaleString()}</span>
      <span className="text-[var(--text-faint)]">links</span>
    </div>
  );
}

function AppShell({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const readOnly = useReadOnly();
  const groups = readOnly === false ? navGroups : navGroups.filter((g) => g.label !== BUILD_GROUP);
  const navItems = groups.flatMap((g) => g.items);
  return (
    <div className="flex min-h-full">
      <aside className="glass-strong hidden lg:flex w-56 shrink-0 flex-col border-r px-3 py-5" style={{ borderColor: "var(--glass-border)" }}>
        <Link to="/" reloadDocument aria-label="Graph RAG home" className="mb-8 flex items-center gap-2.5 rounded-md px-2">
          {/* Soft white glow to match the logo's white linework, not --accent green. */}
          <img
            src="/logo.svg"
            alt=""
            className="h-8 w-8 rounded-lg"
            style={{ boxShadow: "0 0 18px rgba(255,255,255,0.14)" }}
          />
          <div>
            <div className="text-sm font-semibold leading-tight">Graph RAG</div>
            <div className="mono text-[10px] leading-tight tracking-wide text-[var(--text-faint)]">capstone</div>
          </div>
        </Link>
        <nav className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    reloadDocument={item.reload}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 ${
                        isActive
                          ? "bg-[var(--accent-soft)] text-[var(--text)] font-medium"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--accent)]"
                          />
                        )}
                        <item.icon
                          className="h-4 w-4"
                          strokeWidth={2}
                          aria-hidden
                          style={{ color: isActive ? "var(--accent)" : undefined }}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-8 space-y-3 border-t border-[var(--border)] px-3 pt-5">
          <GraphStats />
          <div className="flex items-center justify-between">
            <BackendStatus />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="scrim-header sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] px-5 lg:hidden">
          <Link to="/" reloadDocument aria-label="Graph RAG home" className="flex min-h-11 items-center gap-2.5 rounded-md">
            <img src="/logo.svg" alt="" className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-semibold">Graph RAG</span>
          </Link>
          <div className="flex items-center gap-2">
            <BackendStatus />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </header>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border)] px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              reloadDocument={item.reload}
              className={({ isActive }) =>
                `flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
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

/** A Build page: shown on a writable backend, sent to the Dashboard on a
 *  read-only one, blank for the moment it takes to find out. */
function BuildOnly({ page }: { page: React.ReactElement }) {
  const readOnly = useReadOnly();
  if (readOnly === false) return page;
  return readOnly ? <Navigate to="/dashboard" replace /> : null;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(savedTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    setTheme(next);
  };

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage theme={theme} onToggleTheme={toggleTheme} />} />
        <Route element={<AppShell theme={theme} onToggleTheme={toggleTheme} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/graph-tree" element={<ExplorerPage />} />
          {/* The page's old address, so earlier links still land on it. */}
          <Route path="/explorer" element={<Navigate to="/graph-tree" replace />} />
          <Route path="/admin" element={<BuildOnly page={<AdminPage />} />} />
          <Route path="/eval" element={<BuildOnly page={<EvalPage />} />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
