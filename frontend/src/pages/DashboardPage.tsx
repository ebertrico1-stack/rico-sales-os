import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, DashboardStats } from "../lib/api";

const cards: { key: keyof DashboardStats; label: string; color?: string }[] = [
  { key: "callsToday", label: "Calls heute" },
  { key: "reachedToday", label: "Erreicht", color: "text-later" },
  { key: "notReachedToday", label: "Nicht erreicht", color: "text-overdue" },
  { key: "callbacksOpen", label: "Rückrufe offen", color: "text-today" },
  { key: "appointmentsUpcoming", label: "Termine" },
  { key: "conversionRate", label: "Conversion", suffix: "%" } as any,
];

interface Appointment {
  id: string;
  scheduledAt: string;
  location?: string;
  contact: { firstName: string; lastName: string; phone?: string; company?: string; id?: string };
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboard().then(setStats).catch((e) => setError(e.message));
    api.upcomingAppointments().then(setAppointments).catch(() => {});
  }, []);

  if (error) return <p className="p-4 text-sm text-overdue">{error}</p>;
  if (!stats) return <p className="p-4 text-sm text-muted">Lade Kennzahlen …</p>;

  return (
    <div className="mx-auto max-w-lg px-4 pb-safe-nav pt-6">
      <header className="mb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border border-border bg-surface px-4 py-3">
            <div className={`font-display text-3xl font-bold ${c.color ?? "text-ink"}`}>
              {stats[c.key]}
              {(c as any).suffix ?? ""}
            </div>
            <div className="mt-0.5 text-sm text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      {appointments.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Nächste Termine</p>
          <div className="space-y-2">
            {appointments.map((a) => (
              <button
                key={a.id}
                onClick={() => a.contact.id && navigate(`/kontakte/${a.contact.id}`)}
                className="flex w-full items-center justify-between gap-2 rounded-lg bg-base px-3 py-2 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{a.contact.firstName} {a.contact.lastName}</p>
                  <p className="text-xs text-muted">{a.contact.company ?? a.contact.phone ?? ""}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {new Date(a.scheduledAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Gesamt</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Row label="Kontakte gesamt" value={stats.totalContacts} />
          <Row label="Neue Kontakte" value={stats.newContacts} />
          <Row label="Abgeschlossen" value={stats.completedContacts} />
        </div>
      </div>

      <Link
        to="/import-export"
        className="mt-4 block rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-ink"
      >
        Import & Export
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold text-ink">{value}</span>
    </div>
  );
}
