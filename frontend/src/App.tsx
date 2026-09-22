import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { apiGet } from "./lib/api";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import ComparePage from "./pages/ComparePage";
import EvalPage from "./pages/EvalPage";
import ExplorerPage from "./pages/ExplorerPage";

const tabs = [
  { to: "/", label: "Chat", end: true },
  { to: "/compare", label: "Compare" },
  { to: "/explorer", label: "Explorer" },
  { to: "/admin", label: "Admin" },
  { to: "/eval", label: "Eval" },
];

function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    apiGet<{ status: string }>("/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("down"));
  }, []);

  const color = status === "ok" ? "bg-green-500" : status === "down" ? "bg-red-500" : "bg-gray-400";
  return (
    <span className="flex items-center gap-2 text-sm text-gray-500">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      backend: {status}
    </span>
  );
}

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Graph RAG Capstone</span>
        <nav className="flex gap-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => (isActive ? "font-semibold" : "text-gray-500")}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <BackendStatus />
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/eval" element={<EvalPage />} />
        </Routes>
      </main>
    </div>
  );
}
