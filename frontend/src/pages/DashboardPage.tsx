import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function DashboardPage() {
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Kennzahlen konnten nicht geladen werden."))))
      .then((d) => setTotalContacts(d.totalContacts))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <header className="mb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
      </header>

      {error && <p className="mb-4 text-sm text-overdue">{error}</p>}

      <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="font-display text-3xl font-bold text-ink">
          {totalContacts ?? "…"}
        </div>
        <div className="mt-0.5 text-sm text-muted">Kontakte gesamt</div>
      </div>

      <Link
        to="/import-export"
        className="block rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-ink"
      >
        Import & Export
      </Link>
    </div>
  );
}
